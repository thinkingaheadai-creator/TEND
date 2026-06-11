"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { completeItem, uncompleteItem } from "@/lib/items";
import { tap } from "@/lib/haptics";
import type { Item } from "@/lib/db";

type Variant = "today" | "overdue" | "done";

type Props = {
  item: Item;
  variant: Variant;
  onOpen?: (id: string) => void;
};

function formatDueLabel(item: Item, variant: Variant): string | null {
  if (variant === "done") return null;
  const dueAt = item.dueAt;
  if (dueAt == null) return null;

  const due = new Date(dueAt);
  const now = new Date();
  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  const hasTime = due.getHours() !== 0 || due.getMinutes() !== 0;

  if (variant === "overdue") {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(due);
  }

  if (sameDay) {
    if (!hasTime) return null;
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(due);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(due);
}

export default function ItemRow({ item, variant, onOpen }: Props) {
  const isDone = variant === "done";
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);

  async function handleToggle() {
    if (isProcessing) return;
    tap("light");
    setIsProcessing(true);
    try {
      if (isDone) {
        await uncompleteItem(item.id);
      } else {
        setPendingComplete(true);
        await completeItem(item.id);
      }
    } catch {
      setPendingComplete(false);
    } finally {
      setIsProcessing(false);
    }
  }

  const checked = isDone || pendingComplete;
  const titleClass = isDone
    ? "text-faint line-through"
    : pendingComplete
      ? "text-faint line-through"
      : variant === "overdue"
        ? "text-danger"
        : "text-foreground";

  const dueLabel = formatDueLabel(item, variant);
  const dueClass = variant === "overdue" ? "text-danger" : "text-muted";

  return (
    <div className="group flex items-center gap-3 rounded-md border-b border-line px-2 py-3 transition-colors hover:bg-surface">
      <button
        type="button"
        aria-label={isDone ? "Mark incomplete" : "Mark complete"}
        onClick={handleToggle}
        disabled={isProcessing}
        className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center p-2"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] transition-colors duration-150 ${
            checked
              ? "border-accent bg-accent text-accent-foreground"
              : "border-line-strong bg-transparent text-transparent"
          }`}
        >
          <Check
            size={14}
            strokeWidth={2.5}
            className={`transition-opacity duration-150 ${
              checked ? "opacity-100" : "opacity-0"
            }`}
          />
        </span>
      </button>
      <button
        type="button"
        onClick={() => onOpen?.(item.id)}
        className={`flex-1 truncate text-left text-[15px] transition-colors duration-200 ${titleClass}`}
      >
        {item.title}
      </button>
      {dueLabel && (
        <span className={`shrink-0 text-xs ${dueClass}`}>{dueLabel}</span>
      )}
    </div>
  );
}
