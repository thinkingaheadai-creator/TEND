import webpush from "web-push";

let initialized = false;

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
  webpush.setVapidDetails(clean(subject), clean(publicKey), clean(privateKey));
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
