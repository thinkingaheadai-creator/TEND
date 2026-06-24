import { qstash } from "@/lib/server/qstash";
import { redis } from "@/lib/server/redis";

function deliverUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  return `${baseUrl.replace(/\/+$/, "")}/api/notifications/deliver`;
}

const MAPPING_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_DELAY_MS = 7 * 24 * 60 * 60 * 1000; // QStash free tier max

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

  console.log("schedule: received", { itemId, dueAt, remindBeforeMinutes, fireAt });

  if (fireAt <= Date.now()) {
    return new Response("too soon, won't schedule", { status: 400 });
  }

  const delayMs = fireAt - Date.now();
  if (delayMs > MAX_DELAY_MS) {
    console.log("schedule: skipped (too-far)", {
      itemId,
      daysOut: Math.round(delayMs / 86_400_000),
    });
    return Response.json(
      { ok: false, skipped: true, reason: "too-far", fireAt },
      { status: 200 },
    );
  }

  const url = deliverUrl();
  const mappingKey = `qstash-msg:${deviceId}:${itemId}`;

  try {
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
      console.error("schedule: failed", { itemId, error: "no messageId returned" });
      return new Response("qstash returned no messageId", { status: 502 });
    }

    await redis.set(mappingKey, messageId, { ex: MAPPING_TTL_SECONDS });

    console.log("schedule: queued", { itemId, messageId, fireAt });
    return Response.json({ ok: true, messageId, fireAt });
  } catch (err) {
    console.error("schedule: failed", { itemId, error: String(err) });
    return new Response("schedule failed", { status: 500 });
  }
}
