import { redis } from "@/lib/server/redis";

type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function POST(request: Request): Promise<Response> {
  let body: { deviceId?: unknown; subscription?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  const subscription = body.subscription as PushSubscriptionJSON | undefined;

  if (!deviceId) return new Response("missing deviceId", { status: 400 });
  if (
    !subscription ||
    typeof subscription.endpoint !== "string" ||
    !subscription.keys ||
    typeof subscription.keys.p256dh !== "string" ||
    typeof subscription.keys.auth !== "string"
  ) {
    return new Response("invalid subscription", { status: 400 });
  }

  await redis.set(`subscription:${deviceId}`, JSON.stringify(subscription), {
    ex: ONE_YEAR_SECONDS,
  });

  return Response.json({ ok: true });
}
