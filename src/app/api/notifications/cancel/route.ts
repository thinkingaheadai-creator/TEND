import { qstash } from "@/lib/server/qstash";
import { redis } from "@/lib/server/redis";

export async function POST(request: Request): Promise<Response> {
  let body: { deviceId?: unknown; itemId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  if (!deviceId || !itemId) {
    return new Response("missing fields", { status: 400 });
  }

  const mappingKey = `qstash-msg:${deviceId}:${itemId}`;
  const messageId = await redis.get<string>(mappingKey);
  if (messageId) {
    try {
      await qstash.messages.cancel(messageId);
    } catch {
      // ignore: message may already have fired or been canceled
    }
    await redis.del(mappingKey);
  }

  return Response.json({ ok: true });
}
