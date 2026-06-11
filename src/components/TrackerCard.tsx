"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import type { Item } from "@/lib/db";
import type { Recurrence } from "@/lib/recurrence";
import {
  describeRecurrence,
  isCompletedForCurrentPeriod,
} from "@/lib/recurrence";
import { completeTracker, uncompleteTracker } from "@/lib/items";
import { bestStreak, currentStreak, streakStripCells } from "@/lib/streak";
import { tap } from "@/lib/haptics";

type Props = {
  item: Item;
  onOpen?: (id: string) => void;
};

export default function TrackerCard({ item, onOpen }: Props) {
  const recurrence = item.recurrence as Recurrence;
  const [now] = useState(() => Date.now());

  const completed = isCompletedForCurrentPeriod(
    recurrence,
    item.completedAt ?? null,
    now
  );
  const cells = streakStripCells(item, 14, now);
  const cur = currentStreak(item);
  const best = bestStreak(item);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    tap("light");
    if (completed) {
      await uncompleteTracker(item.id);
    } else {
      await completeTracker(item.id);
    }
  };

  const streakLine = (() => {
    if (cur === 0) return "No streak yet — start when you’re ready";
    if (best > cur) return `Current streak: ${cur} · Best: ${best}`;
    return `Current streak: ${cur}`;
  })();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${item.title}`}
      onClick={() => onOpen?.(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(item.id);
        }
      }}
      className="cursor-pointer rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong focus:outline-none focus:border-line-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-medium text-foreground">{item.title}</h3>
        <button
          type="button"
          aria-label={completed ? "Mark incomplete" : "Mark complete"}
          onClick={handleToggle}
          className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center p-2"
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] transition-colors duration-150 ${
              completed
                ? "border-accent bg-accent text-accent-foreground"
                : "border-line-strong bg-transparent text-transparent"
            }`}
          >
            <Check
              size={16}
              strokeWidth={2.5}
              className={`transition-opacity duration-150 ${
                completed ? "opacity-100" : "opacity-0"
              }`}
            />
          </span>
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">
        {describeRecurrence(recurrence)}
      </p>
      <div
        className="mt-4 flex gap-1"
        suppressHydrationWarning
        aria-label="Last 14 days"
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-sm ${
              cell === "filled"
                ? "bg-accent"
                : cell === "outlined"
                  ? "border border-line-strong bg-transparent"
                  : "bg-transparent"
            }`}
          />
        ))}
      </div>
      <p className="mt-4 text-xs text-faint" suppressHydrationWarning>
        {streakLine}
      </p>
    </div>
  );
}
