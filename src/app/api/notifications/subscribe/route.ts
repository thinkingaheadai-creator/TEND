import { redis } from "@/lib/server/redis";

type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

export async function POST(request: Request): Promise<Response> {
  try {
    let body: { deviceId?: unknown; subscription?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return new Response("invalid json", { status: 400 });
    }

    const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
    const subscription = body.subscription as PushSubscriptionJSON | undefined;

    if (!deviceId) {
      return new Response("missing deviceId", { status: 400 });
    }
    if (
      !subscription ||
      typeof subscription.endpoint !== "string" ||
      !subscription.keys ||
      typeof subscription.keys.p256dh !== "string" ||
      typeof subscription.keys.auth !== "string"
    ) {
      return new Response("missing or invalid subscription", { status: 400 });
    }

    await redis.set(`subscription:${deviceId}`, subscription);

    console.log("subscribe: stored", {
      deviceId,
      endpoint: subscription.endpoint,
    });

    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("subscribe: failed to store subscription", message);
    return new Response(`subscribe failed: ${message}`, { status: 500 });
  }
}
