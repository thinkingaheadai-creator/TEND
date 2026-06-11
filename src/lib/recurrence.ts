export type Recurrence =
  | { kind: "daily"; interval: number }
  | { kind: "weekly"; interval: number; weekdays: number[] }
  | { kind: "monthly"; interval: number; dayOfMonth: number }
  | { kind: "yearly"; month: number; day: number }
  | { kind: "after-completion"; intervalDays: number };

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

function clampDayInMonth(year: number, month: number, day: number): Date {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

export function nextOccurrence(
  recurrence: Recurrence,
  fromTs: number,
  lastCompletedAt: number | null
): number | null {
  switch (recurrence.kind) {
    case "after-completion": {
      if (lastCompletedAt == null) return fromTs;
      return lastCompletedAt + recurrence.intervalDays * DAY_MS;
    }

    case "daily": {
      return startOfDay(fromTs);
    }

    case "weekly": {
      const weekdays = recurrence.weekdays;
      if (!weekdays || weekdays.length === 0) return null;
      const set = new Set(weekdays);
      for (let i = 0; i < 14; i++) {
        const candidate = new Date(fromTs);
        candidate.setHours(0, 0, 0, 0);
        candidate.setDate(candidate.getDate() + i);
        if (set.has(candidate.getDay())) return candidate.getTime();
      }
      return null;
    }

    case "monthly": {
      const from = new Date(fromTs);
      const fromDay = startOfDay(fromTs);
      const thisMonth = clampDayInMonth(
        from.getFullYear(),
        from.getMonth(),
        recurrence.dayOfMonth
      );
      thisMonth.setHours(0, 0, 0, 0);
      if (thisMonth.getTime() >= fromDay) return thisMonth.getTime();
      const nextMonth = clampDayInMonth(
        from.getFullYear(),
        from.getMonth() + 1,
        recurrence.dayOfMonth
      );
      nextMonth.setHours(0, 0, 0, 0);
      return nextMonth.getTime();
    }

    case "yearly": {
      const from = new Date(fromTs);
      const fromDay = startOfDay(fromTs);
      const thisYear = clampDayInMonth(
        from.getFullYear(),
        recurrence.month,
        recurrence.day
      );
      thisYear.setHours(0, 0, 0, 0);
      if (thisYear.getTime() >= fromDay) return thisYear.getTime();
      const nextYear = clampDayInMonth(
        from.getFullYear() + 1,
        recurrence.month,
        recurrence.day
      );
      nextYear.setHours(0, 0, 0, 0);
      return nextYear.getTime();
    }
  }
}

export function isCompletedForCurrentPeriod(
  recurrence: Recurrence,
  lastCompletedAt: number | null,
  now: number
): boolean {
  if (lastCompletedAt == null) return false;
  switch (recurrence.kind) {
    case "daily":
      return startOfDay(lastCompletedAt) === startOfDay(now);
    case "weekly":
      return startOfWeekMonday(lastCompletedAt) === startOfWeekMonday(now);
    case "monthly":
      return startOfMonth(lastCompletedAt) === startOfMonth(now);
    case "yearly":
      return startOfYear(lastCompletedAt) === startOfYear(now);
    case "after-completion":
      return now - lastCompletedAt < recurrence.intervalDays * DAY_MS;
  }
}

export function isScheduledOnDay(recurrence: Recurrence, dayTs: number): boolean {
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

export function describeRecurrence(recurrence: Recurrence): string {
  switch (recurrence.kind) {
    case "daily":
      return recurrence.interval === 1
        ? "Every day"
        : `Every ${recurrence.interval} days`;
    case "weekly": {
      const all = [0, 1, 2, 3, 4, 5, 6];
      const days = [...recurrence.weekdays].sort((a, b) => a - b);
      if (days.length === 7) return "Every day";
      const weekendOnly =
        days.length === 2 && days.includes(0) && days.includes(6);
      const weekdayOnly =
        days.length === 5 && all.slice(1, 6).every((d) => days.includes(d));
      if (weekdayOnly) return "Every weekday";
      if (weekendOnly) return "Every weekend";
      const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `Every ${days.map((d) => names[d]).join(", ")}`;
    }
    case "monthly":
      return `Monthly on the ${ordinal(recurrence.dayOfMonth)}`;
    case "yearly": {
      const d = new Date(2000, recurrence.month, recurrence.day);
      const fmt = new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
      });
      return `Every year on ${fmt.format(d)}`;
    }
    case "after-completion":
      return recurrence.intervalDays === 1
        ? "Every day after completion"
        : `Every ${recurrence.intervalDays} days after completion`;
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
