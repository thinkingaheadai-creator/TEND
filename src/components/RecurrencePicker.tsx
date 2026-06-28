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
  const [yearDay, setYearDay] = useState(
    value?.kind === "yearly" ? value.day : new Date().getDate()
  );
  const [intervalDays, setIntervalDays] = useState(
    value?.kind === "after-completion" ? value.intervalDays : 3
  );

  useEffect(() => {
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
            type="number"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(e) =>
              setDayOfMonth(
                Math.max(1, Math.min(31, Number(e.target.value) || 1))
              )
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
              type="number"
              min={1}
              max={31}
              value={yearDay}
              onChange={(e) =>
                setYearDay(
                  Math.max(1, Math.min(31, Number(e.target.value) || 1))
                )
              }
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
