"use client";

import { useSyncExternalStore } from "react";

export type PermissionState = "unsupported" | "default" | "granted" | "denied";

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): PermissionState {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as PermissionState;
}

function getServerSnapshot(): PermissionState {
  return "default";
}

export function useNotificationPermission(): {
  state: PermissionState;
  request: () => Promise<PermissionState>;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const request = async (): Promise<PermissionState> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    const result = await Notification.requestPermission();
    notify();
    return result as PermissionState;
  };

  return { state, request };
}

export async function fireNotification(opts: {
  title: string;
  body?: string;
  tag?: string;
  itemId?: string;
}): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) {
    new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag,
      icon: "/icons/icon-192.png",
    });
    return;
  }
  await reg.showNotification(opts.title, {
    body: opts.body ?? "",
    tag: opts.tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { itemId: opts.itemId },
    requireInteraction: false,
  });
}
