"use client";

import { Drawer } from "vaul";
import { useEffect, useRef, useState } from "react";
import { Calendar, X } from "lucide-react";
import { addItem } from "@/lib/items";
import { parseInput } from "@/lib/parse";
import { tap } from "@/lib/haptics";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function QuickCapture({ open, onOpenChange }: Props) {
  const [text, setText] = useState("");
  const [ignoreDate, setIgnoreDate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = parseInput(text);
  const showChip = parsed.dueAt !== null && !ignoreDate;

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setText("");
      setIgnoreDate(false);
    }
  }

  const [prevText, setPrevText] = useState(text);
  if (prevText !== text) {
    setPrevText(text);
    setIgnoreDate(false);
  }

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [open]);

  const save = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    tap("medium");
    await addItem({
      title: ignoreDate ? trimmed : parsed.title,
      dueAt: ignoreDate ? null : parsed.dueAt ?? undefined,
    });
    onOpenChange(false);
  };

  const formatDate = (ts: number) => {
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
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-[var(--scrim)] backdrop-blur-sm" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[70] mt-24 flex max-h-[calc(100dvh-env(safe-area-inset-top))] flex-col rounded-t-2xl border-t border-line bg-surface text-foreground shadow-lg shadow-black/20 outline-none md:left-1/2 md:right-auto md:bottom-auto md:top-1/2 md:max-h-[85dvh] md:w-[560px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          }}
        >
          <Drawer.Title className="sr-only">Quick capture</Drawer.Title>
          <Drawer.Description className="sr-only">
            Add a task, reminder, or note
          </Drawer.Description>
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong md:hidden" />
          <div className="px-6 pt-6">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  save();
                }
              }}
              placeholder="What's on your mind?"
              className="w-full bg-transparent text-xl text-foreground placeholder:text-faint outline-none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="mt-4 min-h-[28px]">
              {showChip && parsed.dueAt !== null && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(parsed.dueAt)}</span>
                  <button
                    type="button"
                    onClick={() => setIgnoreDate(true)}
                    className="ml-1 rounded-full p-0.5 hover:bg-line-strong"
                    aria-label="Remove date"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="mt-3 border-t border-line pt-3 text-xs text-faint">
              <span className="hidden md:inline">Enter to save · Esc to close</span>
              <span className="md:hidden">Return to save · Tap outside to close</span>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
