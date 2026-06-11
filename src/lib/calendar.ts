import {
  addDays,
  format,
  isSameDay as dfIsSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export function startOfWeekFor(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function daysOfWeek(date: Date): Date[] {
  const start = startOfWeekFor(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function daysOfMonthGrid(date: Date): Date[] {
  const firstOfMonth = startOfMonth(date);
  const gridStart = startOfWeek(firstOfMonth, { weekStartsOn: 1 });
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function sameDay(a: Date | number, b: Date | number): boolean {
  return dfIsSameDay(a, b);
}

export function formatHour(h: number): string {
  const date = new Date();
  date.setHours(h, 0, 0, 0);
  return format(date, "h a");
}
