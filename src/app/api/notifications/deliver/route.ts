import { qstashReceiver } from "@/lib/server/qstash";
import { redis } from "@/lib/server/redis";
import { sendWebPush } from "@/lib/server/webpush";

type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

function isWebPushError(
  e: unknown,
): e is { statusCode: number; body?: string; message?: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    "statusCode" in e &&
    typeof (e as { statusCode: unknown }).statusCode === "number"
  );
}

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "(unparseable)";
  }
}

export async function POST(request: Request): Promise<Response> {
  const bodyText = await request.text();
  const signature = request.headers.get("upstash-signature") ?? "";

  let valid = false;
  try {
    valid = await qstashReceiver.verify({ signature, body: bodyText });
  } catch {
    valid = false;
  }
  if (!valid) {
    console.log("deliver: invalid signature");
    return new Response("invalid signature", { status: 401 });
  }

  let payload: { deviceId?: unknown; itemId?: unknown; title?: unknown; body?: unknown };
  try {
    payload = JSON.parse(bodyText) as typeof payload;
  } catch {
    console.log("deliver: invalid json");
    return new Response("ok", { status: 200 });
  }

  const deviceId = typeof payload.deviceId === "string" ? payload.deviceId : "";
  const itemId = typeof payload.itemId === "string" ? payload.itemId : "";
  const title = typeof payload.title === "string" ? payload.title : "";
  const messageBody = typeof payload.body === "string" ? payload.body : "";

  console.log("deliver: received", { deviceId, itemId });

  if (!deviceId || !itemId || !title) {
    console.log("deliver: missing fields", { deviceId, itemId, hasTitle: !!title });
    return new Response("ok", { status: 200 });
  }

  const raw = await redis.get<PushSubscriptionJSON | string>(`subscription:${deviceId}`);
  let subscription: PushSubscriptionJSON | null = null;
  if (typeof raw === "string") {
    try {
      subscription = JSON.parse(raw) as PushSubscriptionJSON;
    } catch {
      subscription = null;
    }
  } else if (raw && typeof raw === "object") {
    subscription = raw;
  }

  if (!subscription) {
    console.log("deliver: no subscription for deviceId", deviceId);
    return new Response("ok", { status: 200 });
  }

  console.log("deliver: subscription found", {
    deviceId,
    endpointHost: endpointHost(subscription.endpoint),
  });

  try {
    await sendWebPush(
      subscription,
      JSON.stringify({ title, body: messageBody, itemId }),
    );
    console.log("deliver: web-push success", { deviceId, itemId });
  } catch (e) {
    if (isWebPushError(e) && (e.statusCode === 404 || e.statusCode === 410)) {
      await redis.del(`subscription:${deviceId}`);
      console.log("deliver: subscription expired (410), removed", {
        deviceId,
        statusCode: e.statusCode,
      });
      return new Response("ok", { status: 200 });
    }
    const statusCode = isWebPushError(e) ? e.statusCode : null;
    const body = isWebPushError(e) ? e.body : undefined;
    const message = e instanceof Error ? e.message : String(e);
    console.log("deliver: web-push failed", { deviceId, itemId, statusCode, body, message });
    return new Response("ok", { status: 200 });
  }

  await redis.del(`qstash-msg:${deviceId}:${itemId}`);
  return Response.json({ ok: true });
}
