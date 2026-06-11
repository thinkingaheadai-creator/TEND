import type { Item } from "./db";
import type { Recurrence } from "./recurrence";

const DAY_MS = 86_400_000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeekMonday(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const offset = (dow + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d.getTime();
}

function startOfMonth(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.getTime();
}

function startOfYear(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setMonth(0, 1);
  return d.getTime();
}

function periodKey(recurrence: Recurrence, ts: number): number {
  switch (recurrence.kind) {
    case "daily":
      return startOfDay(ts);
    case "weekly":
      return startOfWeekMonday(ts);
    case "monthly":
      return startOfMonth(ts);
    case "yearly":
      return startOfYear(ts);
    case "after-completion":
      return startOfDay(ts);
  }
}

function prevPeriodStart(recurrence: Recurrence, periodStart: number): number {
  const d = new Date(periodStart);
  switch (recurrence.kind) {
    case "daily":
      d.setDate(d.getDate() - 1);
      return d.getTime();
    case "weekly":
      d.setDate(d.getDate() - 7);
      return d.getTime();
    case "monthly":
      d.setMonth(d.getMonth() - 1);
      return d.getTime();
    case "yearly":
      d.setFullYear(d.getFullYear() - 1);
      return d.getTime();
    case "after-completion":
      return periodStart;
  }
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

export function currentStreak(item: Item): number {
  if (!item.recurrence) return 0;
  const r = item.recurrence;
  const completions = (item.completions ?? []).slice().sort((a, b) => a - b);
  if (completions.length === 0) return 0;
  const now = Date.now();

  if (r.kind === "after-completion") {
    const latest = completions[completions.length - 1];
    if (now - latest > r.intervalDays * DAY_MS) return 0;
    let streak = 1;
    for (let i = completions.length - 1; i > 0; i--) {
      if (completions[i] - completions[i - 1] <= r.intervalDays * DAY_MS) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  const periodsDesc = uniqueSorted(completions.map((c) => periodKey(r, c))).reverse();
  const currentPeriod = periodKey(r, now);
  const previousPeriod = prevPeriodStart(r, currentPeriod);

  let expected: number;
  if (periodsDesc[0] === currentPeriod) {
    expected = currentPeriod;
  } else if (periodsDesc[0] === previousPeriod) {
    expected = previousPeriod;
  } else {
    return 0;
  }

  let streak = 0;
  for (const p of periodsDesc) {
    if (p === expected) {
      streak++;
      expected = prevPeriodStart(r, expected);
    } else if (p < expected) {
      break;
    }
  }
  return streak;
}

export function bestStreak(item: Item): number {
  if (!item.recurrence) return 0;
  const r = item.recurrence;
  const completions = (item.completions ?? []).slice().sort((a, b) => a - b);
  if (completions.length === 0) return 0;

  if (r.kind === "after-completion") {
    let best = 1;
    let run = 1;
    for (let i = 1; i < completions.length; i++) {
      if (completions[i] - completions[i - 1] <= r.intervalDays * DAY_MS) {
        run++;
        if (run > best) best = run;
      } else {
        run = 1;
      }
    }
    return best;
  }

  const periods = uniqueSorted(completions.map((c) => periodKey(r, c)));
  let best = 1;
  let run = 1;
  for (let i = 1; i < periods.length; i++) {
    const expectedNext = prevPeriodStart(r, periods[i]);
    if (expectedNext === periods[i - 1]) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

export type StripCell = "filled" | "outlined" | "hidden";

export function streakStripCells(item: Item, days = 14, now = Date.now()): StripCell[] {
  if (!item.recurrence) return [];
  const r = item.recurrence;
  const completedDays = new Set(
    (item.completions ?? []).map((c) => startOfDay(c))
  );
  const today = startOfDay(now);
  const cells: StripCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayTs = d.getTime();
    const completed = completedDays.has(dayTs);
    if (completed) {
      cells.push("filled");
      continue;
    }
    if (r.kind === "after-completion") {
      cells.push("hidden");
      continue;
    }
    const scheduled = isScheduledOnDay(r, dayTs);
    if (!scheduled) {
      cells.push("hidden");
      continue;
    }
    if (dayTs > today) {
      cells.push("hidden");
      continue;
    }
    cells.push("outlined");
  }
  return cells;
}

function isScheduledOnDay(recurrence: Recurrence, dayTs: number): boolean {
  const day = new Date(dayTs);
  day.setHours(0, 0, 0, 0);
  switch (recurrence.kind) {
    case "daily":
      return true;
    case "weekly":
      return recurrence.weekdays.includes(day.getDay());
    case "monthly":
      return day.getDate() === recurrence.dayOfMonth;
    case "yearly":
      return (
        day.getMonth() === recurrence.month && day.getDate() === recurrence.day
      );
    case "after-completion":
      return false;
  }
}
