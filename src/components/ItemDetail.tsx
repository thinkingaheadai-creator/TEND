"use client";

import { Drawer } from "vaul";
import * as Popover from "@radix-ui/react-popover";
import { useCallback, useEffect, useRef, useState } from "react";
import { Trash, X } from "lucide-react";
import { deleteItem, updateItem, useItem } from "@/lib/items";
import { AREAS, type AreaId } from "@/lib/areas";
import { startOfToday, thisWeekend, tomorrow } from "@/lib/dates";
import type { Item, Area } from "@/lib/db";
import type { Recurrence } from "@/lib/recurrence";
import { describeRecurrence } from "@/lib/recurrence";
import { relativeTime } from "@/lib/time";
import { useIsDesktop } from "@/lib/responsive";
import { tap } from "@/lib/haptics";
import RecurrencePicker from "./RecurrencePicker";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  const datePart = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  if (!hasTime) return datePart;
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart}, ${timePart}`;
}

function formatHistoryStamp(ts: number): string {
  const d = new Date(ts);
  const datePart = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} at ${timePart}`;
}

type Props = {
  id: string | null;
  onClose: () => void;
};

export default function ItemDetail({ id, onClose }: Props) {
  const item = useItem(id);
  const isDesktop = useIsDesktop();
  const open = id != null;

  function handleOpenChange(next: boolean) {
    if (!next) onClose();
  }

  if (isDesktop) {
    return (
      <Drawer.Root
        open={open}
        onOpenChange={handleOpenChange}
        direction="right"
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
          <Drawer.Content
            className="fixed right-0 top-0 z-[70] flex h-screen w-[480px] flex-col border-l border-line bg-surface text-foreground shadow-2xl shadow-black/20 outline-none"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <Drawer.Title className="sr-only">Item detail</Drawer.Title>
            <Drawer.Description className="sr-only">
              Edit this item
            </Drawer.Description>
            {item && <DetailContent item={item} onClose={onClose} />}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[70] flex h-[85vh] flex-col rounded-t-2xl border-t border-line bg-surface text-foreground shadow-2xl shadow-black/20 outline-none"
          style={{
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <Drawer.Title className="sr-only">Item detail</Drawer.Title>
          <Drawer.Description className="sr-only">
            Edit this item
          </Drawer.Description>
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong" />
          {item && <DetailContent item={item} onClose={onClose} />}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

type ContentProps = {
  item: Item;
  onClose: () => void;
};

function DetailContent({ item, onClose }: ContentProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      confirmTimerRef.current = setTimeout(() => {
        setConfirmDelete(false);
      }, 3000);
      return;
    }
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    tap("strong");
    await deleteItem(item.id);
    onClose();
  }

  const isRecurring = item.recurrence != null;
  const completions = item.completions ?? [];
  const hasHistory =
    (isRecurring && completions.length > 0) ||
    (!isRecurring && item.completedAt != null);

  return (
    <>
      <div className="flex shrink-0 items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => {
            tap("light");
            onClose();
          }}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          aria-label={confirmDelete ? "Tap again to delete" : "Delete"}
          className={`flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-full px-3 transition-colors ${
            confirmDelete
              ? "text-danger hover:bg-surface-2"
              : "text-faint hover:bg-surface-2 hover:text-foreground"
          }`}
        >
          {confirmDelete && (
            <span className="text-xs">Tap again to delete</span>
          )}
          <Trash size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className="scroll-momentum flex-1 overflow-y-auto px-6 pb-8">
        <TitleInput item={item} />

        {!isRecurring && <WhenSection item={item} />}

        <RepeatsSection item={item} />

        <AreaSection item={item} />

        <NotesSection item={item} />

        {hasHistory && <HistorySection item={item} />}

        <p className="mt-10 text-xs text-faint">
          Created {relativeTime(item.createdAt)}
        </p>
      </div>
    </>
  );
}

function TitleInput({ item }: { item: Item }) {
  const [value, setValue] = useState(item.title);
  const lastIdRef = useRef(item.id);

  useEffect(() => {
    if (lastIdRef.current !== item.id) {
      lastIdRef.current = item.id;
      setValue(item.title);
    }
  }, [item.id, item.title]);

  async function commit() {
    const trimmed = value.trim();
    if (trimmed === item.title) return;
    await updateItem(item.id, { title: trimmed });
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      placeholder="Untitled"
      className="selectable mt-2 w-full bg-transparent font-serif text-2xl text-foreground placeholder:text-faint outline-none"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
    />
  );
}

type ScheduleOption = { label: string; getValue: () => number };

const SCHEDULE_OPTIONS: ScheduleOption[] = [
  { label: "Today", getValue: startOfToday },
  { label: "Tomorrow", getValue: tomorrow },
  { label: "This weekend", getValue: thisWeekend },
];

function WhenSection({ item }: { item: Item }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  const pick = async (ts: number) => {
    await updateItem(item.id, { dueAt: ts });
    setCustomOpen(false);
    setPopoverOpen(false);
  };

  const clear = async () => {
    await updateItem(item.id, { dueAt: null });
    setCustomOpen(false);
    setPopoverOpen(false);
  };

  const onCustomChange = async (value: string) => {
    if (!value) return;
    const parts = value.split("-").map((n) => parseInt(n, 10));
    if (parts.length !== 3 || parts.some(Number.isNaN)) return;
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d, 9, 0, 0, 0);
    await pick(date.getTime());
  };

  return (
    <section className="mt-8 flex items-center justify-between gap-3">
      <p className="text-xs uppercase tracking-wider text-muted">Due</p>
      <Popover.Root
        open={popoverOpen}
        onOpenChange={(o) => {
          setPopoverOpen(o);
          if (!o) setCustomOpen(false);
        }}
      >
        <Popover.Trigger asChild>
          {item.dueAt != null ? (
            <button
              type="button"
              onClick={() => tap("light")}
              className="inline-flex min-h-[44px] items-center rounded-full bg-surface-2 px-3 py-1 text-xs text-foreground hover:bg-line transition-colors"
            >
              {formatDate(item.dueAt)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => tap("light")}
              className="inline-flex min-h-[44px] items-center font-serif text-sm italic text-faint hover:text-muted"
            >
              No date
            </button>
          )}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={6}
            className="z-[80] rounded-lg border border-line-strong bg-surface shadow-xl outline-none"
          >
            <div className="flex flex-col gap-1 p-2 min-w-[200px]">
              {SCHEDULE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => pick(opt.getValue())}
                  className="rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-line"
                >
                  {opt.label}
                </button>
              ))}
              {customOpen ? (
                <input
                  type="date"
                  autoFocus
                  onChange={(e) => onCustomChange(e.target.value)}
                  className="rounded-md bg-surface-2 px-3 py-2 text-base text-foreground outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setCustomOpen(true)}
                  className="rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-line"
                >
                  Custom
                </button>
              )}
              {item.dueAt != null && (
                <button
                  type="button"
                  onClick={clear}
                  className="rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-line hover:text-foreground"
                >
                  Remove date
                </button>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </section>
  );
}

function RepeatsSection({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const recurrence = (item.recurrence ?? null) as Recurrence | null;

  async function handleChange(r: Recurrence) {
    await updateItem(item.id, { recurrence: r });
  }

  async function handleClear() {
    await updateItem(item.id, { recurrence: null });
    setOpen(false);
  }

  return (
    <section className="mt-6">
      <p className="mb-2 text-xs uppercase tracking-wider text-muted">
        Repeats
      </p>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          {recurrence ? (
            <button
              type="button"
              onClick={() => tap("light")}
              className="inline-flex min-h-[44px] items-center text-sm text-foreground hover:text-accent"
            >
              {describeRecurrence(recurrence)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => tap("light")}
              className="inline-flex min-h-[44px] items-center font-serif text-sm italic text-faint hover:text-muted"
            >
              Doesn&apos;t repeat
            </button>
          )}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-[80] w-[360px] rounded-lg border border-line-strong bg-surface p-4 shadow-xl outline-none"
          >
            <RecurrencePicker value={recurrence} onChange={handleChange} />
            <div className="mt-4 flex items-center justify-between gap-3">
              {recurrence ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-muted hover:text-foreground"
                >
                  Stop repeating
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground"
              >
                Done
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </section>
  );
}

function AreaSection({ item }: { item: Item }) {
  async function pick(id: AreaId) {
    const next: Area | null = item.area === id ? null : id;
    await updateItem(item.id, { area: next });
  }

  return (
    <section className="mt-6">
      <p className="mb-2 text-xs uppercase tracking-wider text-muted">
        Area
      </p>
      <div className="flex flex-wrap gap-2">
        {AREAS.map((a) => {
          const active = item.area === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => pick(a.id)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "border border-line-strong text-muted hover:text-foreground"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function NotesSection({ item }: { item: Item }) {
  const [value, setValue] = useState(item.notes ?? "");
  const lastIdRef = useRef(item.id);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(item.notes ?? "");

  useEffect(() => {
    if (lastIdRef.current !== item.id) {
      lastIdRef.current = item.id;
      setValue(item.notes ?? "");
      lastSavedRef.current = item.notes ?? "";
    }
  }, [item.id, item.notes]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const save = useCallback(
    async (next: string) => {
      if (next === lastSavedRef.current) return;
      lastSavedRef.current = next;
      await updateItem(item.id, { notes: next });
    },
    [item.id]
  );

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void save(next);
    }, 800);
  }

  function handleBlur() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void save(value);
  }

  return (
    <section className="mt-6">
      <p className="mb-2 text-xs uppercase tracking-wider text-muted">
        Notes
      </p>
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add context, links, anything…"
        className="selectable min-h-[120px] w-full resize-none bg-transparent text-base text-foreground placeholder:text-faint outline-none"
      />
    </section>
  );
}

function HistorySection({ item }: { item: Item }) {
  const isRecurring = item.recurrence != null;
  const completions = (item.completions ?? []).slice().sort((a, b) => b - a);
  const recent = completions.slice(0, 5);

  return (
    <section className="mt-6">
      <p className="mb-2 text-xs uppercase tracking-wider text-muted">
        History
      </p>
      {isRecurring ? (
        <ul className="flex flex-col gap-1">
          {recent.map((ts) => (
            <li key={ts} className="text-xs text-muted">
              {formatHistoryStamp(ts)}
            </li>
          ))}
        </ul>
      ) : item.completedAt != null ? (
        <p className="text-sm text-foreground">
          Completed {relativeTime(item.completedAt)}
        </p>
      ) : null}
    </section>
  );
}
