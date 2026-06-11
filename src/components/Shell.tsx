"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Sun,
  Inbox,
  Activity,
  Calendar,
  Settings,
  Plus,
  LucideIcon,
} from "lucide-react";
import QuickCapture from "./QuickCapture";
import { tap } from "@/lib/haptics";
import { useNotificationScheduler } from "@/lib/scheduler";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", Icon: Sun },
  { href: "/inbox", label: "Inbox", Icon: Inbox },
  { href: "/trackers", label: "Trackers", Icon: Activity },
  { href: "/calendar", label: "Calendar", Icon: Calendar },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [captureOpen, setCaptureOpen] = useState(false);

  useNotificationScheduler();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCaptureOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-bg text-foreground">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-line px-4 py-6">
        <Link
          href="/today"
          className="font-serif text-3xl text-foreground px-3 mb-8"
        >
          Tend
        </Link>
        <button
          type="button"
          onClick={() => setCaptureOpen(true)}
          className="flex items-center justify-between rounded-full border border-line bg-surface px-3 py-2 mb-4 text-sm text-foreground hover:border-line-strong hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <Plus size={16} strokeWidth={1.75} />
            Quick capture
          </span>
          <span className="text-xs text-faint">⌘K</span>
        </button>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-surface-2 text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Icon size={18} strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="safe-top flex min-h-screen flex-col pb-20 md:pb-0 md:pl-60">
        {children}
      </main>

      <button
        type="button"
        onClick={() => {
          tap("light");
          setCaptureOpen(true);
        }}
        aria-label="Quick capture"
        style={{ bottom: "calc(6rem + env(safe-area-inset-bottom))" }}
        className="md:hidden fixed right-4 z-50 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-black/20 touch-manipulation cursor-pointer select-none active:scale-95 transition-transform"
      >
        <Plus size={26} strokeWidth={2} />
      </button>

      <nav
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg"
      >
        <ul className="flex items-stretch justify-around px-2 py-2">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-[11px] transition-colors ${
                    active
                      ? "bg-surface-2 text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.75} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <QuickCapture open={captureOpen} onOpenChange={setCaptureOpen} />
    </div>
  );
}
