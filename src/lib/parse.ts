import * as chrono from "chrono-node";

export type ParseResult = {
  title: string;
  dueAt: number | null;
  matchedText: string | null;
};

const ORDINAL_DAY_RE = /\b(?:on\s+)?the\s+(\d{1,2})(?:st|nd|rd|th)\b/i;
const TRAILING_CONNECTORS = /\s+(on|at|by|in|for|the)\s*$/i;
const LEADING_CONNECTORS = /^(on|at|by|in|for|the)\s+/i;

export function parseInput(text: string): ParseResult {
  const raw = text;
  const results = chrono.parse(raw);

  if (results.length > 0) {
    const result = results[0];
    const matchedText = result.text;
    let date = result.date();
    const yearCertain = result.start.isCertain("year");
    if (!yearCertain && date.getTime() < Date.now()) {
      date = new Date(date);
      date.setFullYear(date.getFullYear() + 1);
    }
    return {
      title: cleanTitle(raw, result.index, matchedText.length),
      dueAt: date.getTime(),
      matchedText,
    };
  }

  const m = raw.match(ORDINAL_DAY_RE);
  if (m && m.index !== undefined) {
    const day = parseInt(m[1], 10);
    if (day >= 1 && day <= 31) {
      const date = nextDayOfMonth(day);
      return {
        title: cleanTitle(raw, m.index, m[0].length),
        dueAt: date.getTime(),
        matchedText: m[0],
      };
    }
  }

  return { title: raw.trim(), dueAt: null, matchedText: null };
}

function nextDayOfMonth(day: number): Date {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
  if (thisMonth.getDate() === day && thisMonth.getTime() >= Date.now()) {
    return thisMonth;
  }
  for (let i = 1; i <= 12; i++) {
    const candidate = new Date(now.getFullYear(), now.getMonth() + i, day);
    if (candidate.getDate() === day) return candidate;
  }
  return thisMonth;
}

function cleanTitle(raw: string, index: number, length: number): string {
  const before = raw.slice(0, index);
  const after = raw.slice(index + length);
  let title = (before + " " + after).replace(/\s+/g, " ").trim();
  while (TRAILING_CONNECTORS.test(title)) {
    title = title.replace(TRAILING_CONNECTORS, "").trim();
  }
  while (LEADING_CONNECTORS.test(title)) {
    title = title.replace(LEADING_CONNECTORS, "").trim();
  }
  return title.replace(/[,;:\-]+\s*$/, "").trim();
}

export function formatDateChip(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;

  let datePart: string;
  if (sameDay(date, now)) {
    datePart = "Today";
  } else if (sameDay(date, tomorrow)) {
    datePart = "Tomorrow";
  } else if (date.getFullYear() === now.getFullYear()) {
    datePart = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  } else {
    datePart = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  if (hasTime) {
    const timePart = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
    return `${datePart}, ${timePart}`;
  }
  return datePart;
}
