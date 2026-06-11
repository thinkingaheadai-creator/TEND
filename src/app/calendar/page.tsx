"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, addMonths, format } from "date-fns";
import { useRef, useState } from "react";
import AgendaView, { type AgendaViewHandle } from "@/components/AgendaView";
import ItemDetail from "@/components/ItemDetail";
import MonthView from "@/components/MonthView";
import WeekView from "@/components/WeekView";
import { startOfWeekFor } from "@/lib/calendar";
import { useIsDesktop } from "@/lib/responsive";

type CalendarView = "agenda" | "week" | "month";

const STORAGE_KEY = "tend.calendar.view";

function useCalendarView(isDesktop: boolean): [
  CalendarView,
  (next: CalendarView) => void,
] {
  const [view, setView] = useState<CalendarView>("agenda");
  const [lastIsDesktop, setLastIsDesktop] = useState<boolean | null>(null);

  if (typeof window !== "undefined" && lastIsDesktop !== isDesktop) {
    setLastIsDesktop(isDesktop);
    const stored = window.localStorage.getItem(STORAGE_KEY) as CalendarView | null;
    if (stored === "agenda" || stored === "week" || stored === "month") {
      setView(stored);
    } else {
      setView(isDesktop ? "week" : "agenda");
    }
  }

  function update(next: CalendarView) {
    setView(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return [view, update];
}

export default function CalendarPage() {
  const isDesktop = useIsDesktop();
  const [view, setView] = useCalendarView(isDesktop);
  const [focusDate, setFocusDate] = useState<Date>(() => new Date());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const agendaRef = useRef<AgendaViewHandle | null>(null);

  const headerLabel = (() => {
    if (view === "agenda") return "Upcoming";
    if (view === "month") return format(focusDate, "MMMM yyyy");
    return "This week";
  })();

  function handlePrev() {
    if (view === "week") setFocusDate((d) => addDays(d, -7));
    else if (view === "month") setFocusDate((d) => addMonths(d, -1));
  }

  function handleNext() {
    if (view === "week") setFocusDate((d) => addDays(d, 7));
    else if (view === "month") setFocusDate((d) => addMonths(d, 1));
  }

  function handleToday() {
    setFocusDate(new Date());
  }

  function handleSelectDay(day: Date) {
    setFocusDate(day);
    setView("agenda");
    setTimeout(() => {
      agendaRef.current?.scrollToDay(day);
    }, 50);
  }

  const weekFocus = startOfWeekFor(focusDate);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-6 py-8 md:px-12 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">
            Calendar
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">{headerLabel}</h1>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </header>

      {view !== "agenda" && (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground"
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="rounded-full border border-line-strong px-3 py-1 text-xs text-foreground hover:bg-surface"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground"
          >
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
        </div>
      )}

      <div className="mt-6 mb-6 border-t border-line" />

      {view === "agenda" && (
        <AgendaView ref={agendaRef} onOpenItem={setSelectedItemId} />
      )}
      {view === "week" && (
        <WeekView
          focusDate={weekFocus}
          isDesktop={isDesktop}
          onOpenItem={setSelectedItemId}
        />
      )}
      {view === "month" && (
        <MonthView
          focusDate={focusDate}
          isDesktop={isDesktop}
          onSelectDay={handleSelectDay}
        />
      )}

      <ItemDetail
        id={selectedItemId}
        onClose={() => setSelectedItemId(null)}
      />
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: CalendarView;
  onChange: (next: CalendarView) => void;
}) {
  const options: { value: CalendarView; label: string }[] = [
    { value: "agenda", label: "Agenda" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Calendar view"
      className="inline-flex rounded-full border border-line bg-surface p-1 text-xs"
    >
      {options.map((opt) => {
        const active = view === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`min-h-[44px] rounded-full px-3 py-1 transition-colors md:min-h-0 ${
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
