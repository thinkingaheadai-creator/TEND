"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { addDays, format, startOfDay } from "date-fns";
import ItemRow from "./ItemRow";
import { useAgendaItems } from "@/lib/items";
import { sameDay } from "@/lib/calendar";
import type { Item } from "@/lib/db";

type Props = {
  onOpenItem: (id: string) => void;
  daysAhead?: number;
};

export type AgendaViewHandle = {
  scrollToDay: (day: Date) => void;
};

function dayHeaderLabel(day: Date, today: Date): string {
  const datePart = format(day, "EEE, MMM d").toUpperCase();
  if (sameDay(day, today)) return `TODAY · ${datePart}`;
  if (sameDay(day, addDays(today, 1))) return `TOMORROW · ${datePart}`;
  return datePart;
}

const AgendaView = forwardRef<AgendaViewHandle, Props>(function AgendaView(
  { onOpenItem, daysAhead = 14 },
  ref
) {
  const items = useAgendaItems(daysAhead);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dayRefs = useRef<Map<string, HTMLElement>>(new Map());

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayTs = today.getTime();

  useImperativeHandle(ref, () => ({
    scrollToDay(day: Date) {
      const key = format(startOfDay(day), "yyyy-MM-dd");
      const el = dayRefs.current.get(key);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  }));

  const { overdue, byDay } = useMemo(() => {
    const overdue: Item[] = [];
    const byDay = new Map<string, Item[]>();
    if (!items) return { overdue, byDay };
    for (const item of items) {
      const due = item.dueAt as number;
      if (item.completedAt == null && due < todayTs) {
        overdue.push(item);
        continue;
      }
      const dayKey = format(startOfDay(new Date(due)), "yyyy-MM-dd");
      const list = byDay.get(dayKey);
      if (list) list.push(item);
      else byDay.set(dayKey, [item]);
    }
    return { overdue, byDay };
  }, [items, todayTs]);

  if (!items) {
    return null;
  }

  const totalCount = items.length;

  if (totalCount === 0) {
    return (
      <p className="mt-16 text-center font-serif italic text-faint">
        Nothing on the horizon. Capture with ⌘K.
      </p>
    );
  }

  const dayBlocks: { day: Date; key: string; items: Item[] }[] = [];
  for (let i = 0; i < daysAhead; i++) {
    const day = addDays(today, i);
    const key = format(day, "yyyy-MM-dd");
    const list = byDay.get(key);
    if (list && list.length > 0) {
      dayBlocks.push({ day, key, items: list });
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-8">
      {overdue.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs uppercase tracking-wider text-muted">
            Overdue
          </h2>
          <div>
            {overdue.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                variant="overdue"
                onOpen={onOpenItem}
              />
            ))}
          </div>
        </section>
      )}

      {dayBlocks.map(({ day, key, items: dayItems }) => (
        <section
          key={key}
          ref={(el) => {
            if (el) dayRefs.current.set(key, el);
            else dayRefs.current.delete(key);
          }}
        >
          <h2 className="mb-2 text-xs uppercase tracking-wider text-muted">
            {dayHeaderLabel(day, today)}
          </h2>
          <div>
            {dayItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                variant={item.completedAt != null ? "done" : "today"}
                onOpen={onOpenItem}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
});

export default AgendaView;
