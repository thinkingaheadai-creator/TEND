import webpush from "web-push";

let initialized = false;

// Validates a VAPID public key is a URL-safe base64url-encoded uncompressed
// P-256 public key. Throws a descriptive (non-leaking) error otherwise.
function validatePublicKey(key: string): void {
  const fingerprint = `length=${key.length}, first4=${key.slice(0, 4)}, last4=${key.slice(-4)}`;
  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error(
      `VAPID public key is not URL-safe base64 (must match [A-Za-z0-9_-], no '='). ${fingerprint}`,
    );
  }
  if (key.length !== 87 && key.length !== 88) {
    throw new Error(
      `VAPID public key has unexpected length (expected 87 or 88 for a base64url P-256 key). ${fingerprint}`,
    );
  }
}

function init(): void {
  if (initialized) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      "VAPID env vars missing: VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY",
    );
  }
  const clean = (s: string) =>
    s.trim().replace(/^['"]|['"]$/g, "").replace(/=+$/, "");
  const cleanPublicKey = clean(publicKey);
  validatePublicKey(cleanPublicKey);
  webpush.setVapidDetails(clean(subject), cleanPublicKey, clean(privateKey));
  initialized = true;
}

export async function sendWebPush(
  subscription: webpush.PushSubscription,
  payload: string,
): Promise<webpush.SendResult> {
  init();
  return webpush.sendNotification(subscription, payload);
}

export { webpush };
