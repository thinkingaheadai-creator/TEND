"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Drawer } from "vaul";
import { Calendar, Tag } from "lucide-react";
import type { Item } from "@/lib/db";
import { assignArea, scheduleItem } from "@/lib/items";
import { AREAS } from "@/lib/areas";
import { startOfToday, thisWeekend, tomorrow } from "@/lib/dates";
import { relativeTime } from "@/lib/time";
import { useIsDesktop } from "@/lib/responsive";

type Props = { item: Item; onOpen?: (id: string) => void };

type ScheduleOption = { label: string; getValue: () => number };

const SCHEDULE_OPTIONS: ScheduleOption[] = [
  { label: "Today", getValue: startOfToday },
  { label: "Tomorrow", getValue: tomorrow },
  { label: "This weekend", getValue: thisWeekend },
];

function ChipButton({
  icon,
  label,
  ...rest
}: {
  icon: React.ReactNode;
  label: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="inline-flex min-h-[44px] shrink-0 items-center justify-center md:min-h-0"
      {...rest}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-foreground hover:bg-line transition-colors">
        {icon}
        <span className="hidden md:inline">{label}</span>
      </span>
    </button>
  );
}

function ScheduleMenu({
  item,
  close,
}: {
  item: Item;
  close: () => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);

  const pick = async (ts: number) => {
    await scheduleItem(item.id, ts);
    close();
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
    <div className="flex flex-col gap-1 p-2 min-w-[180px]">
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
    </div>
  );
}

function AreaMenu({
  item,
  close,
}: {
  item: Item;
  close: () => void;
}) {
  const pick = async (id: string) => {
    await assignArea(item.id, id);
    close();
  };

  return (
    <div className="flex flex-col gap-1 p-2 min-w-[180px]">
      {AREAS.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => pick(a.id)}
          className="rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-line"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

function ActionMenu({
  trigger,
  title,
  children,
  open,
  onOpenChange,
  isDesktop,
}: {
  trigger: React.ReactNode;
  title: string;
  children: (close: () => void) => React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDesktop: boolean;
}) {
  const close = () => onOpenChange(false);

  if (isDesktop) {
    return (
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger asChild>{trigger}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={6}
            className="z-[80] rounded-lg border border-line-strong bg-surface shadow-xl outline-none"
          >
            {children(close)}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <>
      {trigger}
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
          <Drawer.Content
            className="fixed bottom-0 left-0 right-0 z-[70] mt-24 flex flex-col rounded-t-2xl border-t border-line bg-surface outline-none"
            style={{
              paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
            }}
          >
            <Drawer.Title className="sr-only">{title}</Drawer.Title>
            <Drawer.Description className="sr-only">
              Choose an option
            </Drawer.Description>
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong" />
            <div className="px-3 pt-4">{children(close)}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

export default function InboxRow({ item, onOpen }: Props) {
  const isDesktop = useIsDesktop();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  return (
    <div className="group flex items-start gap-3 rounded-md border-b border-line px-2 py-3 transition-colors hover:bg-surface">
      <button
        type="button"
        onClick={() => onOpen?.(item.id)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-base text-foreground">{item.title}</p>
        <p className="mt-0.5 text-xs text-faint">
          Captured {relativeTime(item.createdAt)}
        </p>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        <ActionMenu
          isDesktop={isDesktop}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          title="Schedule"
          trigger={
            <ChipButton
              icon={<Calendar size={14} strokeWidth={1.75} />}
              label="Schedule"
              onClick={() => setScheduleOpen(true)}
              aria-label="Schedule"
            />
          }
        >
          {(close) => <ScheduleMenu item={item} close={close} />}
        </ActionMenu>
        <ActionMenu
          isDesktop={isDesktop}
          open={areaOpen}
          onOpenChange={setAreaOpen}
          title="Area"
          trigger={
            <ChipButton
              icon={<Tag size={14} strokeWidth={1.75} />}
              label="Area"
              onClick={() => setAreaOpen(true)}
              aria-label="Assign area"
            />
          }
        >
          {(close) => <AreaMenu item={item} close={close} />}
        </ActionMenu>
      </div>
    </div>
  );
}
