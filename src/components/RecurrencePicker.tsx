"use client";

import { useEffect, useState } from "react";
import type { Recurrence } from "@/lib/recurrence";
import { tap } from "@/lib/haptics";

type Kind = Recurrence["kind"];

const KINDS: { id: Kind; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
  { id: "after-completion", label: "After completion" },
];

// Max days for a given month index. 2000 is a leap year, so February
// returns 29 — yearly recurrences can legitimately land on Feb 29.
function daysInMonth(month: number): number {
  return new Date(2000, month + 1, 0).getDate();
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type Props = {
  value: Recurrence | null;
  onChange: (value: Recurrence) => void;
};

export default function RecurrencePicker({ value, onChange }: Props) {
  console.log("[picker-debug] render", {
    valueProp: value,
    kind: value?.kind,
  });
  const [kind, setKind] = useState<Kind>(value?.kind ?? "daily");
  const [weekdays, setWeekdays] = useState<number[]>(
    value?.kind === "weekly" ? value.weekdays : [1, 3, 5]
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    value?.kind === "monthly" ? value.dayOfMonth : 1
  );
  const [yearMonth, setYearMonth] = useState(
    value?.kind === "yearly" ? value.month : new Date().getMonth()
  );
  const [yearDay, setYearDay] = useState(() => {
    const initial = value?.kind === "yearly" ? value.day : new Date().getDate();
    console.log("[picker-debug] yearDay init", { initial, valueAtInit: value });
    return initial;
  });
  const [intervalDays, setIntervalDays] = useState(
    value?.kind === "after-completion" ? value.intervalDays : 3
  );

  // The DAY inputs hold raw text while editing so the field reflects exactly
  // what the user typed (including a temporarily empty string). The numeric
  // state above is only committed on blur, where we clamp to a valid day.
  const [dayOfMonthInput, setDayOfMonthInput] = useState(String(dayOfMonth));
  const [yearDayInput, setYearDayInput] = useState(() => {
    const initial = String(yearDay);
    console.log("[picker-debug] yearDayInput init", { initial });
    return initial;
  });

  function commitDay(
    raw: string,
    current: number,
    max: number,
    setValue: (n: number) => void,
    setText: (s: string) => void
  ) {
    const n = parseInt(raw, 10);
    const clamped = isNaN(n) ? current : Math.min(Math.max(n, 1), max);
    setValue(clamped);
    setText(String(clamped));
  }

  useEffect(() => {
    console.log("[picker-debug] effect fired: push state -> onChange", {
      kind,
      dayOfMonth,
      yearMonth,
      yearDay,
      intervalDays,
    });
    let next: Recurrence | null = null;
    switch (kind) {
      case "daily":
        next = { kind: "daily", interval: 1 };
        break;
      case "weekly":
        if (weekdays.length === 0) return;
        next = { kind: "weekly", interval: 1, weekdays };
        break;
      case "monthly":
        next = { kind: "monthly", interval: 1, dayOfMonth };
        break;
      case "yearly":
        next = { kind: "yearly", month: yearMonth, day: yearDay };
        break;
      case "after-completion":
        next = { kind: "after-completion", intervalDays };
        break;
    }
    if (next) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, weekdays, dayOfMonth, yearMonth, yearDay, intervalDays]);

  function toggleWeekday(d: number) {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">
          Repeats
        </p>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                kind === k.id
                  ? "bg-accent text-accent-foreground"
                  : "border border-line-strong text-muted hover:text-foreground"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {kind === "weekly" && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">
            On these days
          </p>
          <div className="flex gap-2">
            {DAY_LABELS.map((label, i) => {
              const active = weekdays.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    tap("light");
                    toggleWeekday(i);
                  }}
                  className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-xs transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "border border-line-strong text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {kind === "monthly" && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">
            Day of month
          </p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={dayOfMonthInput}
            onChange={(e) =>
              setDayOfMonthInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))
            }
            onBlur={() =>
              commitDay(dayOfMonthInput, dayOfMonth, 31, setDayOfMonth, setDayOfMonthInput)
            }
            className="w-20 rounded-md border border-line-strong bg-transparent px-3 py-1.5 text-base text-foreground outline-none focus:border-accent"
          />
        </div>
      )}

      {kind === "yearly" && (
        <div className="flex gap-3">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-muted">
              Month
            </p>
            <select
              value={yearMonth}
              onChange={(e) => setYearMonth(Number(e.target.value))}
              className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-base text-foreground outline-none focus:border-accent"
            >
              {MONTH_LABELS.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-muted">
              Day
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={yearDayInput}
              onFocus={(e) => {
                console.log("[picker-debug] onFocus", {
                  currentValue: e.target.value,
                  yearDay,
                  yearDayInput,
                });
              }}
              onChange={(e) => {
                console.log("[picker-debug] onChange", {
                  rawInput: e.target.value,
                  yearDay,
                  yearDayInput,
                });
                setYearDayInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 2));
              }}
              onBlur={(e) => {
                console.log("[picker-debug] onBlur", {
                  currentValue: e.target.value,
                  yearDay,
                  yearDayInput,
                });
                commitDay(
                  yearDayInput,
                  yearDay,
                  daysInMonth(yearMonth),
                  setYearDay,
                  setYearDayInput
                );
              }}
              className="w-20 rounded-md border border-line-strong bg-transparent px-3 py-1.5 text-base text-foreground outline-none focus:border-accent"
            />
          </div>
        </div>
      )}

      {kind === "after-completion" && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">
            Every X days after I complete it
          </p>
          <input
            type="number"
            min={1}
            value={intervalDays}
            onChange={(e) =>
              setIntervalDays(Math.max(1, Number(e.target.value) || 1))
            }
            className="w-20 rounded-md border border-line-strong bg-transparent px-3 py-1.5 text-base text-foreground outline-none focus:border-accent"
          />
        </div>
      )}
    </div>
  );
}
