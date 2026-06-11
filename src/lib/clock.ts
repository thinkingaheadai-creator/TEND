"use client";

import { useEffect, useState } from "react";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function msUntilNextMidnight(): number {
  const now = new Date();
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return next.getTime() - now.getTime();
}

export function useDateKey(): string {
  const [key, setKey] = useState(todayKey);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      timer = setTimeout(() => {
        setKey(todayKey());
        schedule();
      }, msUntilNextMidnight() + 100);
    };
    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return key;
}
