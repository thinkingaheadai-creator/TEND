"use client";

import { useEffect, useRef } from "react";
import { db } from "./db";
import { fireNotification } from "./notifications";
import { useSettings } from "./settings";

const NOTIFIED_KEY = "tend.notified";

function getNotified(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveNotified(set: Set<string>): void {
  const arr = Array.from(set).slice(-500);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
}

export function useNotificationScheduler(): void {
  const settings = useSettings();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (!settings.notificationsEnabled) return;
    if (Notification.permission !== "granted") return;

    const tick = async () => {
      const now = Date.now();
      const remindMs = settings.remindBeforeMinutes * 60 * 1000;
      const windowStart = now + remindMs;
      const windowEnd = now + remindMs + 70 * 1000;

      const items = await db.items
        .where("dueAt")
        .between(windowStart, windowEnd, true, true)
        .toArray();

      const notified = getNotified();
      for (const item of items) {
        if (item.completedAt) continue;
        const key = `item:${item.id}:${item.dueAt}`;
        if (notified.has(key)) continue;
        const minsLabel =
          settings.remindBeforeMinutes === 0
            ? "Due now"
            : `Due in ${settings.remindBeforeMinutes} min`;
        await fireNotification({
          title: item.title,
          body: minsLabel,
          tag: item.id,
          itemId: item.id,
        });
        notified.add(key);
      }

      const nowDate = new Date(now);
      const hhmm = `${String(nowDate.getHours()).padStart(2, "0")}:${String(
        nowDate.getMinutes()
      ).padStart(2, "0")}`;
      const todayKey = nowDate.toISOString().slice(0, 10);

      if (
        settings.morningRitualEnabled &&
        hhmm === settings.morningRitualTime
      ) {
        const key = `morning:${todayKey}`;
        if (!notified.has(key)) {
          await fireNotification({
            title: `Good morning${settings.name ? ", " + settings.name : ""}`,
            body: "Take a moment to plan your day.",
            tag: key,
          });
          notified.add(key);
        }
      }
      if (
        settings.eveningRitualEnabled &&
        hhmm === settings.eveningRitualTime
      ) {
        const key = `evening:${todayKey}`;
        if (!notified.has(key)) {
          await fireNotification({
            title: `Good evening${settings.name ? ", " + settings.name : ""}`,
            body: "Take a moment to reflect on today.",
            tag: key,
          });
          notified.add(key);
        }
      }

      saveNotified(notified);
    };

    void tick();
    intervalRef.current = setInterval(() => {
      void tick();
    }, 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    settings.notificationsEnabled,
    settings.remindBeforeMinutes,
    settings.morningRitualEnabled,
    settings.morningRitualTime,
    settings.eveningRitualEnabled,
    settings.eveningRitualTime,
    settings.name,
  ]);
}
