"use client";

import { Drawer } from "vaul";
import { useEffect, useRef, useState } from "react";
import { addItem } from "@/lib/items";
import { AREAS } from "@/lib/areas";
import type { Recurrence } from "@/lib/recurrence";
import RecurrencePicker from "./RecurrencePicker";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function NewTrackerForm({ open, onOpenChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>({
    kind: "daily",
    interval: 1,
  });
  const [area, setArea] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [open]);

  function resetState() {
    setTitle("");
    setRecurrence({ kind: "daily", interval: 1 });
    setArea(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  const canSave = title.trim().length > 0;

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) return;
    await addItem({
      title: trimmed,
      recurrence,
      completions: [],
      area: (area as Parameters<typeof addItem>[0]["area"]) ?? null,
      dueAt: null,
    });
    handleOpenChange(false);
  }

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[70] mt-24 flex max-h-[90vh] flex-col rounded-t-2xl border-t border-line bg-surface text-foreground outline-none md:left-1/2 md:right-auto md:bottom-auto md:top-1/2 md:max-h-[85vh] md:w-[560px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border"
          style={{
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          }}
        >
          <Drawer.Title className="sr-only">New tracker</Drawer.Title>
          <Drawer.Description className="sr-only">
            Create a new recurring tracker
          </Drawer.Description>
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong md:hidden" />
          <div className="flex-1 overflow-y-auto px-6 pt-6">
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canSave) void save();
                }
              }}
              placeholder="Name this tracker"
              className="w-full bg-transparent text-xl text-foreground placeholder:text-faint outline-none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            <div className="mt-6">
              <RecurrencePicker
                value={recurrence}
                onChange={setRecurrence}
              />
            </div>

            <div className="mt-6">
              <p className="mb-2 text-xs uppercase tracking-wider text-muted">
                Area
              </p>
              <div className="flex flex-wrap gap-2">
                {AREAS.map((a) => {
                  const active = area === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setArea(active ? null : a.id)}
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
            </div>
          </div>

          <div className="mt-6 flex shrink-0 justify-end border-t border-line px-6 pt-4">
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-opacity disabled:opacity-40"
            >
              Save tracker
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
