"use client";

import { useState, useSyncExternalStore } from "react";
import ItemRow from "@/components/ItemRow";
import ItemDetail from "@/components/ItemDetail";
import InstallHint from "@/components/InstallHint";
import {
  useCompletedTodayItems,
  useOverdueItems,
  useTodayItems,
} from "@/lib/items";
import { useSettings } from "@/lib/settings";

function greeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function formatDateLine(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

const noopSubscribe = () => () => {};

export default function TodayPage() {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  const { name } = useSettings();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const overdue = useOverdueItems();
  const todayAll = useTodayItems();
  const done = useCompletedTodayItems();

  const overdueIds = new Set((overdue ?? []).map((i) => i.id));
  const today = (todayAll ?? []).filter((i) => !overdueIds.has(i.id));

  const overdueCount = overdue?.length ?? 0;
  const todayCount = today.length;
  const totalActive = overdueCount + todayCount;

  const summary = (() => {
    if (totalActive === 0) return "Nothing on today";
    const itemPart = `${totalActive} ${totalActive === 1 ? "item" : "items"}`;
    if (overdueCount > 0) return `${itemPart} · ${overdueCount} overdue`;
    return itemPart;
  })();

  const dateLine = mounted ? formatDateLine(new Date()) : "";
  const greetLine = mounted ? greeting(new Date().getHours()) : "Welcome";
  const trimmedName = name.trim();
  const heading = trimmedName.length > 0 ? `${greetLine}, ${trimmedName}` : greetLine;

  const showEmpty =
    totalActive === 0 && (done?.length ?? 0) === 0;

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-8 md:px-12 md:py-12">
      <header>
        <p className="text-sm text-muted">{dateLine}</p>
        <h1 className="mt-1 font-serif text-3xl text-foreground">{heading}</h1>
        <p className="mt-2 text-sm text-muted">{summary}</p>
      </header>

      <div className="mt-6 mb-6 border-t border-line" />

      <InstallHint />

      {showEmpty ? (
        <p className="mt-16 text-center font-serif italic text-faint">
          A quiet day. Add something with ⌘K.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {overdueCount > 0 && (
            <section>
              <h2 className="mb-2 text-xs uppercase tracking-wider text-muted">
                Overdue
              </h2>
              <div>
                {overdue!.map((item) => (
                  <ItemRow key={item.id} item={item} variant="overdue" onOpen={setSelectedItemId} />
                ))}
              </div>
            </section>
          )}

          {todayCount > 0 && (
            <section>
              <h2 className="mb-2 text-xs uppercase tracking-wider text-muted">
                Today
              </h2>
              <div>
                {today.map((item) => (
                  <ItemRow key={item.id} item={item} variant="today" onOpen={setSelectedItemId} />
                ))}
              </div>
            </section>
          )}

          {(done?.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-2 text-xs uppercase tracking-wider text-muted">
                Done
              </h2>
              <div>
                {done!.map((item) => (
                  <ItemRow key={item.id} item={item} variant="done" onOpen={setSelectedItemId} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <ItemDetail
        id={selectedItemId}
        onClose={() => setSelectedItemId(null)}
      />
    </div>
  );
}
