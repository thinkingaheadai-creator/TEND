/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

type PushPayload = { title: string; body: string; itemId?: string };

self.addEventListener("push", (event: ExtendableEvent) => {
  const pushEvent = event as PushEvent;
  if (!pushEvent.data) return;
  let payload: PushPayload = { title: "Tend", body: "" };
  try {
    payload = pushEvent.data.json() as PushPayload;
  } catch {
    payload = { title: "Tend", body: pushEvent.data.text() };
  }
  pushEvent.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.itemId,
      data: { itemId: payload.itemId },
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event: ExtendableEvent) => {
  const notifEvent = event as NotificationEvent;
  notifEvent.notification.close();
  const itemId = (notifEvent.notification.data as { itemId?: string } | null)
    ?.itemId;
  const url = itemId ? `/today?item=${itemId}` : "/today";

  notifEvent.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if (client.url.includes(self.location.origin)) {
          await client.focus();
          if ("navigate" in client) {
            await (client as WindowClient).navigate(url);
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
