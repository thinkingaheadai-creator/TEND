import { qstash } from "@/lib/server/qstash";
import { redis } from "@/lib/server/redis";

function deliverUrl(): string | null {
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}/api/notifications/deliver`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    const base = appUrl.replace(/\/+$/, "");
    return `${base}/api/notifications/deliver`;
  }
  return null;
}

const MAPPING_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: Request): Promise<Response> {
  let body: {
    deviceId?: unknown;
    itemId?: unknown;
    dueAt?: unknown;
    title?: unknown;
    body?: unknown;
    remindBeforeMinutes?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const dueAt = typeof body.dueAt === "number" ? body.dueAt : NaN;
  const title = typeof body.title === "string" ? body.title : "";
  const message = typeof body.body === "string" ? body.body : "";
  const remindBeforeMinutes =
    typeof body.remindBeforeMinutes === "number" ? body.remindBeforeMinutes : NaN;

  if (!deviceId || !itemId || !title) {
    return new Response("missing fields", { status: 400 });
  }
  if (!Number.isFinite(dueAt) || !Number.isFinite(remindBeforeMinutes)) {
    return new Response("invalid dueAt or remindBeforeMinutes", { status: 400 });
  }

  const fireAt = dueAt - remindBeforeMinutes * 60_000;
  if (fireAt <= Date.now()) {
    return new Response("too soon, won't schedule", { status: 400 });
  }

  const url = deliverUrl();
  if (!url) {
    return new Response("server missing VERCEL_URL or NEXT_PUBLIC_APP_URL", {
      status: 500,
    });
  }

  const mappingKey = `qstash-msg:${deviceId}:${itemId}`;
  const existing = await redis.get<string>(mappingKey);
  if (existing) {
    try {
      await qstash.messages.cancel(existing);
    } catch {
      // ignore: message may have already fired or been canceled
    }
  }

  const res = await qstash.publishJSON({
    url,
    body: { deviceId, itemId, title, body: message },
    notBefore: Math.floor(fireAt / 1000),
  });

  const messageId = (res as { messageId?: string }).messageId;
  if (!messageId) {
    return new Response("qstash returned no messageId", { status: 502 });
  }

  await redis.set(mappingKey, messageId, { ex: MAPPING_TTL_SECONDS });

  return Response.json({ ok: true, messageId, fireAt });
}
