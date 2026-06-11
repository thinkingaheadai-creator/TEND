"use client";

import { endOfDay, format, isSameMonth, startOfDay } from "date-fns";
import { useMemo } from "react";
import { daysOfMonthGrid, sameDay } from "@/lib/calendar";
import { useItemsBetween } from "@/lib/items";
import type { Item } from "@/lib/db";

type Props = {
  focusDate: Date;
  isDesktop: boolean;
  onSelectDay: (day: Date) => void;
};

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function MonthView({ focusDate, isDesktop, onSelectDay }: Props) {
  const days = useMemo(() => daysOfMonthGrid(focusDate), [focusDate]);
  const from = startOfDay(days[0]).getTime();
  const to = endOfDay(days[days.length - 1]).getTime();
  const items = useItemsBetween(from, to);
  const today = useMemo(() => startOfDay(new Date()), []);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    if (!items) return map;
    for (const item of items) {
      if (item.dueAt == null) continue;
      const key = format(startOfDay(new Date(item.dueAt)), "yyyy-MM-dd");
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return map;
  }, [items]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-px pb-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] uppercase tracking-wider text-faint"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-line">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, focusDate);
          const isToday = sameDay(day, today);
          const dayItems = itemsByDay.get(key) ?? [];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              className="rounded-sm bg-bg p-1 text-left transition-colors hover:bg-surface"
              style={{
                minHeight: isDesktop ? "96px" : "56px",
              }}
            >
              <div className="flex items-center justify-start">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? "bg-accent text-accent-foreground"
                      : inMonth
                        ? "text-muted"
                        : "text-faint"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>

              {isDesktop ? (
                <div className="mt-1 flex flex-col gap-0.5">
                  {dayItems.slice(0, 2).map((item) => (
                    <span
                      key={item.id}
                      className="truncate rounded-sm bg-surface-2 px-1 text-[10px] text-foreground"
                    >
                      {item.title}
                    </span>
                  ))}
                  {dayItems.length > 2 && (
                    <span className="rounded-sm px-1 text-[10px] text-muted">
                      +{dayItems.length - 2} more
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-0.5">
                  {dayItems.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="h-1 w-1 rounded-full bg-accent"
                    />
                  ))}
                  {dayItems.length > 3 && (
                    <span className="text-[8px] text-muted">+</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
