"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_THEME, THEMES, type ThemeId } from "./themes";

export type Settings = {
  name: string;
  themeId: ThemeId;
  weekStartsOn: 0 | 1;
  tomorrowHour: number;
  defaultArea: string | null;
  notificationsEnabled: boolean;
  remindBeforeMinutes: number;
  morningRitualEnabled: boolean;
  morningRitualTime: string;
  eveningRitualEnabled: boolean;
  eveningRitualTime: string;
};

const STORAGE_KEY = "tend.settings";

const DEFAULTS: Settings = {
  name: "",
  themeId: DEFAULT_THEME,
  weekStartsOn: 1,
  tomorrowHour: 9,
  defaultArea: null,
  notificationsEnabled: false,
  remindBeforeMinutes: 0,
  morningRitualEnabled: true,
  morningRitualTime: "08:00",
  eveningRitualEnabled: true,
  eveningRitualTime: "21:00",
};

const listeners = new Set<() => void>();
let cached: Settings | null = null;

function readFromStorage(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged: Settings = { ...DEFAULTS, ...parsed };
    const validIds = THEMES.map((t) => t.id) as readonly string[];
    if (!validIds.includes(merged.themeId)) {
      merged.themeId = DEFAULT_THEME;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return DEFAULTS;
  }
}

function notify() {
  for (const l of listeners) l();
}

export function getSettings(): Settings {
  if (cached) return cached;
  cached = readFromStorage();
  return cached;
}

export function saveSettings(patch: Partial<Settings>): void {
  const next: Settings = { ...getSettings(), ...patch };
  cached = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  notify();
}

export function clearSettings(): void {
  cached = { ...DEFAULTS };
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  notify();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): Settings {
  return getSettings();
}

function getServerSnapshot(): Settings {
  return DEFAULTS;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    cached = readFromStorage();
    notify();
  });
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
