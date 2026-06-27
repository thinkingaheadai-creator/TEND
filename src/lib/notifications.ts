"use client";

import { useSyncExternalStore } from "react";
import { db, type Item } from "./db";
import { getSettings, type Settings } from "./settings";
import { uuid } from "./uuid";

export type PermissionState = "unsupported" | "default" | "granted" | "denied";

const DEVICE_ID_KEY = "tend.deviceId";
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

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = uuid();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// Holds the most recent subscribe/ensure failure so the UI can surface it.
let lastSubscriptionError: string | null = null;

export function getLastSubscriptionError(): string | null {
  return lastSubscriptionError;
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

// POSTs a subscription to the backend. Throws (with the response body) on any
// non-2xx response so failures are never silent.
async function postSubscriptionToBackend(
  deviceId: string,
  sub: PushSubscription,
): Promise<void> {
  const endpoint = sub.endpoint;
  console.log(
    `subscribe: POSTing to /api/notifications/subscribe with deviceId=${deviceId}`,
  );
  const res = await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, subscription: sub.toJSON() }),
  });
  console.log(`subscribe: backend responded with status=${res.status}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `subscribe: backend rejected with status=${res.status} body=${body} endpoint=${endpoint}`,
    );
  }
}

// Creates (or reuses) a local push subscription and POSTs it to the backend.
// Throws on any failure; callers translate that into a boolean / UI message.
async function subscribeAndPost(): Promise<void> {
  if (typeof window === "undefined") throw new Error("subscribe: not in a browser");
  if (!("serviceWorker" in navigator)) {
    throw new Error("subscribe: serviceWorker unsupported on this device");
  }
  if (!("PushManager" in window)) {
    throw new Error("subscribe: PushManager unsupported on this device");
  }
  if (Notification.permission !== "granted") {
    throw new Error("subscribe: notification permission not granted");
  }

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) {
    throw new Error("subscribe: NEXT_PUBLIC_VAPID_PUBLIC_KEY not configured");
  }

  console.log("subscribe: requesting permission and registering");
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
    } catch (e) {
      console.error("subscribe: pushManager.subscribe failed", e);
      throw toError(e);
    }
  }
  console.log(`subscribe: pushManager.subscribe succeeded, endpoint=${sub.endpoint}`);

  await postSubscriptionToBackend(getDeviceId(), sub);
}

export async function registerPushSubscription(): Promise<boolean> {
  try {
    await subscribeAndPost();
    lastSubscriptionError = null;
    return true;
  } catch (e) {
    lastSubscriptionError = toError(e).message;
    console.error("subscribe: registration failed", e);
    return false;
  }
}

// Guarantees the backend has a current subscription for this device.
// Re-POSTs an existing local subscription (idempotent, recovers from a wiped
// backend) or creates a fresh one. Returns true on success, false on failure;
// the failure reason is available via getLastSubscriptionError().
export async function ensureSubscription(): Promise<boolean> {
  try {
    if (typeof window === "undefined") {
      throw new Error("ensureSubscription: not in a browser");
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("ensureSubscription: push unsupported on this device");
    }
    if (Notification.permission !== "granted") {
      throw new Error("ensureSubscription: notification permission not granted");
    }

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      console.log("ensureSubscription: existing local subscription found, re-POSTing");
      await postSubscriptionToBackend(getDeviceId(), existing);
    } else {
      console.log("ensureSubscription: no local subscription, creating a new one");
      await subscribeAndPost();
    }
    lastSubscriptionError = null;
    return true;
  } catch (e) {
    lastSubscriptionError = toError(e).message;
    console.error("ensureSubscription: failed", e);
    return false;
  }
}

export async function schedulePushForItem(opts: {
  itemId: string;
  dueAt: number;
  title: string;
  body: string;
  remindBeforeMinutes: number;
}): Promise<void> {
  const deviceId = getDeviceId();
  if (!deviceId) return;
  try {
    await fetch("/api/notifications/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...opts, deviceId }),
    });
  } catch (e) {
    console.warn("Tend: schedule push failed", e);
  }
}

export async function cancelPushForItem(itemId: string): Promise<void> {
  const deviceId = getDeviceId();
  if (!deviceId) return;
  try {
    await fetch("/api/notifications/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, itemId }),
    });
  } catch (e) {
    console.warn("Tend: cancel push failed", e);
  }
}

function bodyForRemindMinutes(minutes: number): string {
  return minutes === 0 ? "Due now" : `Due in ${minutes} min`;
}

export async function syncPushForItem(
  item: Item,
  settings: Settings = getSettings(),
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!settings.notificationsEnabled) return cancelPushForItem(item.id);
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return cancelPushForItem(item.id);
  if (item.recurrence) return cancelPushForItem(item.id);
  if (item.completedAt) return cancelPushForItem(item.id);
  if (!item.dueAt) return cancelPushForItem(item.id);

  const fireAt = item.dueAt - settings.remindBeforeMinutes * 60_000;
  if (fireAt <= Date.now()) return cancelPushForItem(item.id);

  await schedulePushForItem({
    itemId: item.id,
    dueAt: item.dueAt,
    title: item.title,
    body: bodyForRemindMinutes(settings.remindBeforeMinutes),
    remindBeforeMinutes: settings.remindBeforeMinutes,
  });
}

export async function syncAllPush(): Promise<void> {
  const settings = getSettings();
  if (!settings.notificationsEnabled) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  const items = await db.items.toArray();
  const now = Date.now();
  const candidates = items.filter(
    (i) =>
      !i.recurrence &&
      !i.completedAt &&
      typeof i.dueAt === "number" &&
      (i.dueAt - settings.remindBeforeMinutes * 60_000) > now,
  );
  for (const item of candidates) {
    await syncPushForItem(item, settings);
  }
}

export async function cancelAllPush(): Promise<void> {
  const items = await db.items.toArray();
  for (const item of items) {
    if (typeof item.dueAt === "number") {
      await cancelPushForItem(item.id);
    }
  }
}
