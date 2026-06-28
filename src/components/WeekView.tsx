"use client";

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { endOfDay, format, startOfDay } from "date-fns";
import { useMemo } from "react";
import { daysOfWeek, formatHour, sameDay } from "@/lib/calendar";
import { updateItem, useItemsBetween } from "@/lib/items";
import { tap } from "@/lib/haptics";
import type { Item } from "@/lib/db";

const HOUR_START = 6;
const HOUR_END = 23;
const HOUR_ROW_PX = 48;

type Props = {
  focusDate: Date;
  isDesktop: boolean;
  onOpenItem: (id: string) => void;
};

function hasSpecificTime(item: Item): boolean {
  if (item.dueAt == null) return false;
  const d = new Date(item.dueAt);
  return d.getHours() !== 0 || d.getMinutes() !== 0;
}

function timeLabel(item: Item): string | null {
  if (!hasSpecificTime(item)) return null;
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(item.dueAt as number));
}

function dropId(day: Date, hour: number): string {
  return `drop-${format(day, "yyyy-MM-dd")}-${String(hour).padStart(2, "0")}`;
}

export default function WeekView({ focusDate, isDesktop, onOpenItem }: Props) {
  const days = useMemo(() => daysOfWeek(focusDate), [focusDate]);
  const from = startOfDay(days[0]).getTime();
  const to = endOfDay(days[6]).getTime();
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("drop-")) return;
    const itemId = String(active.id);
    const item = items?.find((i) => i.id === itemId);
    if (!item || item.dueAt == null) return;
    const match = /^drop-(\d{4}-\d{2}-\d{2})-(\d{2})$/.exec(overId);
    if (!match) return;
    const [, dateStr, hourStr] = match;
    const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
    const hour = parseInt(hourStr, 10);
    const oldDate = new Date(item.dueAt);
    const minutes = oldDate.getMinutes();
    const newDate = new Date(y, m - 1, d, hour, minutes, 0, 0);
    await updateItem(item.id, { dueAt: newDate.getTime() });
  }

  const view = (
    <div className="grid grid-cols-7 min-w-[700px] md:min-w-0">
      {days.map((day, idx) => {
        const key = format(day, "yyyy-MM-dd");
        const isToday = sameDay(day, today);
        const dayItems = itemsByDay.get(key) ?? [];
        const allDayItems = dayItems.filter((it) => !hasSpecificTime(it));
        const timedItems = dayItems.filter((it) => hasSpecificTime(it));
        return (
          <div
            key={key}
            className={`min-w-[100px] flex flex-col ${
              idx < 6 ? "border-r border-line" : ""
            }`}
          >
            <div className="flex flex-col items-center pt-3 pb-2">
              <span className="text-xs uppercase tracking-wider text-muted">
                {format(day, "EEE")}
              </span>
              <span
                className={`mt-1 text-xl ${
                  isToday ? "text-foreground" : "text-muted"
                }`}
              >
                {format(day, "d")}
              </span>
              {isToday && (
                <span className="mt-1 h-1 w-1 rounded-full bg-accent" />
              )}
            </div>

            <div className="px-1 pb-2">
              {allDayItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  draggable={isDesktop}
                  onOpenItem={onOpenItem}
                />
              ))}
            </div>

            {isDesktop && (
              <div
                className="relative border-t border-line"
                style={{
                  height: `${(HOUR_END - HOUR_START + 1) * HOUR_ROW_PX}px`,
                }}
              >
                {Array.from(
                  { length: HOUR_END - HOUR_START + 1 },
                  (_, i) => HOUR_START + i
                ).map((hour) => (
                  <HourCell
                    key={hour}
                    day={day}
                    hour={hour}
                    showLabel={idx === 0}
                  />
                ))}
                {timedItems.map((item) => {
                  const d = new Date(item.dueAt as number);
                  const h = d.getHours();
                  const min = d.getMinutes();
                  if (h < HOUR_START || h > HOUR_END) return null;
                  const top =
                    (h - HOUR_START) * HOUR_ROW_PX + (min / 60) * HOUR_ROW_PX;
                  return (
                    <div
                      key={item.id}
                      className="absolute left-1 right-1"
                      style={{ top: `${top}px` }}
                    >
                      <ItemCard
                        item={item}
                        draggable={isDesktop}
                        onOpenItem={onOpenItem}
                        absolute
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (!isDesktop) {
    return <div className="overflow-x-auto">{view}</div>;
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="scroll-momentum overflow-x-auto">{view}</div>
    </DndContext>
  );
}

function HourCell({
  day,
  hour,
  showLabel,
}: {
  day: Date;
  hour: number;
  showLabel: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId(day, hour) });
  return (
    <div
      ref={setNodeRef}
      className={`relative border-b border-line/60 ${
        isOver ? "bg-surface-2/60" : ""
      }`}
      style={{ height: `${HOUR_ROW_PX}px` }}
    >
      {showLabel && (
        <span className="absolute -top-2 left-1 text-[10px] text-faint">
          {formatHour(hour)}
        </span>
      )}
    </div>
  );
}

function ItemCard({
  item,
  draggable,
  onOpenItem,
  absolute = false,
}: {
  item: Item;
  draggable: boolean;
  onOpenItem: (id: string) => void;
  absolute?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id, disabled: !draggable });

  const style: React.CSSProperties = {};
  if (transform) {
    style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  }
  if (isDragging) style.opacity = 0.8;

  const time = timeLabel(item);

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      style={style}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      className={`mb-1 flex min-h-[44px] flex-col justify-center rounded-lg border border-line bg-surface-2 px-2 py-1.5 ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${absolute ? "shadow-sm" : ""}`}
      onClick={(e) => {
        if (isDragging) return;
        tap("light");
        e.stopPropagation();
        onOpenItem(item.id);
      }}
    >
      <div className="truncate text-xs text-foreground">{item.title}</div>
      {time && (
        <div className="text-[10px] text-muted">{time}</div>
      )}
    </div>
  );
}
