import { qstash } from "@/lib/server/qstash";
import { redis } from "@/lib/server/redis";
import { sendWebPush, webpush } from "@/lib/server/webpush";

type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

type StepStatus = "pass" | "fail" | "skip";
type Step = { step: string; status: StepStatus; detail: string };

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

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

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "QSTASH_TOKEN",
  "QSTASH_CURRENT_SIGNING_KEY",
  "QSTASH_NEXT_SIGNING_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

export async function POST(request: Request): Promise<Response> {
  let body: { deviceId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  if (!deviceId) return new Response("missing deviceId", { status: 400 });

  const steps: Step[] = [];

  // Step 1 — Env vars present
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  const vapidPublicLength = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").length;
  steps.push({
    step: "Env vars present",
    status: missing.length === 0 ? "pass" : "fail",
    detail:
      missing.length === 0
        ? `All ${REQUIRED_ENV_VARS.length} present (VAPID public key length ${vapidPublicLength})`
        : `Missing: ${missing.join(", ")}`,
  });

  // Step 2 — Upstash Redis reachable
  try {
    const probeKey = `diagnostic:ping:${deviceId}`;
    await redis.set(probeKey, "1", { ex: 30 });
    const value = await redis.get(probeKey);
    if (value === "1" || value === 1) {
      steps.push({
        step: "Upstash Redis reachable",
        status: "pass",
        detail: "set/get round-trip succeeded",
      });
    } else {
      steps.push({
        step: "Upstash Redis reachable",
        status: "fail",
        detail: `unexpected value: ${JSON.stringify(value)}`,
      });
    }
  } catch (e) {
    steps.push({
      step: "Upstash Redis reachable",
      status: "fail",
      detail: errorMessage(e),
    });
  }

  // Step 3 — Subscription exists for deviceId
  let subscription: PushSubscriptionJSON | null = null;
  try {
    const raw = await redis.get<PushSubscriptionJSON | string>(
      `subscription:${deviceId}`,
    );
    if (typeof raw === "string") {
      try {
        subscription = JSON.parse(raw) as PushSubscriptionJSON;
      } catch {
        subscription = null;
      }
    } else if (raw && typeof raw === "object") {
      subscription = raw;
    }
  } catch {
    subscription = null;
  }

  if (subscription?.endpoint) {
    steps.push({
      step: "Subscription exists for deviceId",
      status: "pass",
      detail: endpointHost(subscription.endpoint),
    });
  } else {
    steps.push({
      step: "Subscription exists for deviceId",
      status: "fail",
      detail: `No subscription stored for ${deviceId}`,
    });
  }

  // Step 4 — Subscription is for Apple Web Push
  if (subscription?.endpoint) {
    const host = endpointHost(subscription.endpoint);
    steps.push({
      step: "Subscription is for Apple Web Push",
      status: host.includes("apple.com") ? "pass" : "fail",
      detail: host,
    });
  } else {
    steps.push({
      step: "Subscription is for Apple Web Push",
      status: "skip",
      detail: "No subscription to inspect",
    });
  }

  // Step 5 — VAPID keys valid format
  {
    const raw = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
    const stats = {
      length: raw.length,
      firstSix: raw.slice(0, 6),
      lastSix: raw.slice(-6),
      hasEquals: raw.includes("="),
      hasPlus: raw.includes("+"),
      hasSlash: raw.includes("/"),
      hasSpace: /\s/.test(raw),
      hasQuote: raw.includes('"') || raw.includes("'"),
    };

    const malformed =
      stats.hasEquals ||
      stats.hasPlus ||
      stats.hasSlash ||
      stats.hasSpace ||
      stats.hasQuote ||
      ![86, 87, 88].includes(stats.length);

    if (malformed) {
      steps.push({
        step: "VAPID keys valid format",
        status: "fail",
        detail: JSON.stringify(stats),
      });
    } else {
      try {
        const subject = process.env.VAPID_SUBJECT ?? "";
        const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
        webpush.setVapidDetails(subject, raw, privateKey);
        steps.push({
          step: "VAPID keys valid format",
          status: "pass",
          detail: `length ${stats.length}, no padding`,
        });
      } catch (e) {
        steps.push({
          step: "VAPID keys valid format",
          status: "fail",
          detail: `${errorMessage(e)} ${JSON.stringify(stats)}`,
        });
      }
    }
  }

  // Step 6 — QStash reachable
  try {
    await qstash.schedules.list();
    steps.push({
      step: "QStash reachable",
      status: "pass",
      detail: "schedules.list() succeeded",
    });
  } catch (e) {
    const status = isWebPushError(e) ? `${e.statusCode}: ` : "";
    steps.push({
      step: "QStash reachable",
      status: "fail",
      detail: `${status}${errorMessage(e)}`,
    });
  }

  // Step 7 — App URL valid HTTPS
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const isHttps = appUrl.startsWith("https://");
  const isLocalhost = /localhost|127\.0\.0\.1/.test(appUrl);
  steps.push({
    step: "App URL valid HTTPS",
    status: isHttps && !isLocalhost ? "pass" : "fail",
    detail: appUrl || "(not set)",
  });

  // Step 8 — Send test push immediately
  if (subscription?.endpoint) {
    try {
      const result = await sendWebPush(
        subscription,
        JSON.stringify({
          title: "Diagnostic push",
          body: "If you see this, push is working.",
          itemId: "diagnostic",
        }),
      );
      if (result.statusCode === 201) {
        steps.push({
          step: "Send test push immediately",
          status: "pass",
          detail: `statusCode ${result.statusCode}`,
        });
      } else {
        steps.push({
          step: "Send test push immediately",
          status: "fail",
          detail: `Unexpected statusCode ${result.statusCode}: ${result.body}`,
        });
      }
    } catch (e) {
      const statusCode = isWebPushError(e) ? `${e.statusCode} ` : "";
      const errBody = isWebPushError(e) && e.body ? ` — ${e.body}` : "";
      steps.push({
        step: "Send test push immediately",
        status: "fail",
        detail: `${statusCode}${errorMessage(e)}${errBody}`,
      });
    }
  } else {
    steps.push({
      step: "Send test push immediately",
      status: "skip",
      detail: "No subscription to send to",
    });
  }

  const ok = steps.every((s) => s.status !== "fail");
  return Response.json({ ok, steps });
}
