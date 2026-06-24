import { qstashReceiver } from "@/lib/server/qstash";
import { redis } from "@/lib/server/redis";
import { getWebPush } from "@/lib/server/webpush";

type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

function isWebPushError(e: unknown): e is { statusCode: number; message?: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    "statusCode" in e &&
    typeof (e as { statusCode: unknown }).statusCode === "number"
  );
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
    return new Response("invalid signature", { status: 401 });
  }

  let payload: { deviceId?: unknown; itemId?: unknown; title?: unknown; body?: unknown };
  try {
    payload = JSON.parse(bodyText) as typeof payload;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const deviceId = typeof payload.deviceId === "string" ? payload.deviceId : "";
  const itemId = typeof payload.itemId === "string" ? payload.itemId : "";
  const title = typeof payload.title === "string" ? payload.title : "";
  const messageBody = typeof payload.body === "string" ? payload.body : "";

  if (!deviceId || !itemId || !title) {
    return new Response("missing fields", { status: 400 });
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
    return new Response("no subscription", { status: 404 });
  }

  try {
    await getWebPush().sendNotification(
      subscription,
      JSON.stringify({ title, body: messageBody, itemId }),
    );
  } catch (e) {
    if (isWebPushError(e) && (e.statusCode === 404 || e.statusCode === 410)) {
      await redis.del(`subscription:${deviceId}`);
      return new Response("subscription gone", { status: 410 });
    }
    console.error("Tend: webpush.sendNotification failed", e);
    return new Response("send failed", { status: 500 });
  }

  await redis.del(`qstash-msg:${deviceId}:${itemId}`);
  return Response.json({ ok: true });
}
