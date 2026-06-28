"use client";

import { useState } from "react";
import TrackerCard from "@/components/TrackerCard";
import NewTrackerForm from "@/components/NewTrackerForm";
import ItemDetail from "@/components/ItemDetail";
import { addItem, useTrackers } from "@/lib/items";
import { isCompletedForCurrentPeriod } from "@/lib/recurrence";
import { tap } from "@/lib/haptics";
import type { Recurrence } from "@/lib/recurrence";
import type { Item } from "@/lib/db";

export default function TrackersPage() {
  const trackers = useTrackers();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const { doneToday, totalToday } = (() => {
    if (!trackers) return { doneToday: 0, totalToday: 0 };
    let done = 0;
    let total = 0;
    for (const t of trackers) {
      const r = t.recurrence as Recurrence | null;
      if (!r) continue;
      if (r.kind === "daily") {
        total++;
        if (isCompletedForCurrentPeriod(r, t.completedAt ?? null, now)) done++;
      }
    }
    return { doneToday: done, totalToday: total };
  })();

  const isLoading = trackers === undefined;
  const isEmpty = trackers !== undefined && trackers.length === 0;

  const summary = (() => {
    if (isLoading) return "";
    if (isEmpty) return "No trackers yet";
    if (totalToday === 0) return `${trackers!.length} tracker${trackers!.length === 1 ? "" : "s"}`;
    return `${doneToday}/${totalToday} done today`;
  })();

  async function seedSamples() {
    const now = Date.now();
    await addItem({
      title: "Morning meditation",
      recurrence: { kind: "daily", interval: 1 },
      completions: [now],
      completedAt: now,
      area: "health",
    });
    await addItem({
      title: "Pay rent",
      recurrence: { kind: "monthly", interval: 1, dayOfMonth: 1 },
      completions: [],
      area: "finance",
    });
    await addItem({
      title: "Workout",
      recurrence: { kind: "weekly", interval: 1, weekdays: [1, 3, 5] },
      completions: [],
      area: "health",
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1080px] px-6 py-8 md:px-12 md:py-12">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">
            TRACKERS
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">
            Routines &amp; habits
          </h1>
          <p className="mt-2 text-sm text-muted">{summary}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            tap("light");
            setFormOpen(true);
          }}
          className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-surface-2 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-line"
        >
          + New tracker
        </button>
      </header>

      <div className="mt-6 mb-6 border-t border-line" />

      {isEmpty ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="font-serif italic text-faint">
            Nothing to tend to yet.
          </p>
          <button
            type="button"
            onClick={seedSamples}
            className="rounded-full border border-line-strong px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
          >
            Seed sample trackers
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(trackers ?? []).map((item: Item) => (
            <TrackerCard
              key={item.id}
              item={item}
              onOpen={setSelectedItemId}
            />
          ))}
        </div>
      )}

      <NewTrackerForm open={formOpen} onOpenChange={setFormOpen} />
      <ItemDetail
        id={selectedItemId}
        onClose={() => setSelectedItemId(null)}
      />
    </div>
  );
}
