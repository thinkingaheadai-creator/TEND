import { debug } from "@/lib/debug";
import { qstash } from "@/lib/server/qstash";
import { redis } from "@/lib/server/redis";

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

  debug.log("schedule: received", { itemId, dueAt, remindBeforeMinutes, fireAt });

  if (fireAt <= Date.now()) {
    return new Response("too soon, won't schedule", { status: 400 });
  }

  const delayMs = fireAt - Date.now();
  if (delayMs > MAX_DELAY_MS) {
    debug.log("schedule: skipped (too-far)", {
      itemId,
      daysOut: Math.round(delayMs / 86_400_000),
    });
    return Response.json(
      { ok: false, skipped: true, reason: "too-far", fireAt },
      { status: 200 },
    );
  }

  const rawBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!rawBase) {
    return Response.json(
      { ok: false, error: "app url not configured" },
      { status: 500 },
    );
  }

  // Ensure https:// prefix (NEXT_PUBLIC_APP_URL might be stored without scheme)
  const baseUrl = /^https?:\/\//.test(rawBase) ? rawBase : `https://${rawBase}`;
  // Strip trailing slash to avoid double slashes
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const url = `${cleanBase}/api/notifications/deliver`;

  // Validate before sending to QStash
  try {
    new URL(url);
  } catch {
    return Response.json(
      { ok: false, error: `invalid deliver url: ${url}` },
      { status: 500 },
    );
  }

  debug.log("schedule: deliverUrl =", url);

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

    debug.log("schedule: queued", { itemId, messageId, fireAt });
    return Response.json({ ok: true, messageId, fireAt });
  } catch (err) {
    console.error("schedule: failed", { itemId, error: String(err) });
    return new Response("schedule failed", { status: 500 });
  }
}
