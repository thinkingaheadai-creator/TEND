"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { AREAS } from "@/lib/areas";
import { db, type Item } from "@/lib/db";
import {
  clearSettings,
  saveSettings,
  useSettings,
  type Settings,
} from "@/lib/settings";
import { THEMES, type ThemeId } from "@/lib/themes";
import { tap } from "@/lib/haptics";
import Toggle from "@/components/Toggle";
import {
  cancelAllPush,
  ensureSubscription,
  fireNotification,
  getDeviceId,
  getLastSubscriptionError,
  registerPushSubscription,
  syncAllPush,
  useNotificationPermission,
  type PermissionState,
} from "@/lib/notifications";

export default function SettingsPage() {
  const settings = useSettings();

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-8 md:px-12 md:py-12">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted">SETTINGS</p>
        <h1 className="mt-1 font-serif text-3xl text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted">
          Everything lives on this device
        </p>
      </header>

      <div className="mt-6 mb-6 border-t border-line" />

      <ProfileSection settings={settings} />

      <div className="mt-8 pt-8 border-t border-line" />
      <AppearanceSection settings={settings} />

      <div className="mt-8 pt-8 border-t border-line" />
      <DefaultsSection settings={settings} />

      <div className="mt-8 pt-8 border-t border-line" />
      <NotificationsSection settings={settings} />

      <div className="mt-8 pt-8 border-t border-line" />
      <DataSection />

      <div className="mt-8 pt-8 border-t border-line" />
      <AboutSection />

      <div className="mt-8 pt-8 border-t border-line" />
      <DiagnosticsSection />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs uppercase tracking-wider text-muted">{children}</p>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

function ProfileSection({ settings }: { settings: Settings }) {
  const [value, setValue] = useState(settings.name);
  const [lastSeenName, setLastSeenName] = useState(settings.name);
  if (lastSeenName !== settings.name) {
    setLastSeenName(settings.name);
    setValue(settings.name);
  }

  function commit() {
    const trimmed = value.trim();
    if (trimmed === settings.name) return;
    saveSettings({ name: trimmed });
  }

  return (
    <section>
      <SectionLabel>PROFILE</SectionLabel>
      <Row label="Display name">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Your name"
          className="w-48 bg-transparent text-right text-base text-foreground placeholder:text-faint outline-none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </Row>
    </section>
  );
}

function AppearanceSection({ settings }: { settings: Settings }) {
  return (
    <section>
      <SectionLabel>APPEARANCE</SectionLabel>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {THEMES.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            selected={settings.themeId === theme.id}
            onSelect={() => {
              tap("light");
              saveSettings({ themeId: theme.id as ThemeId });
            }}
          />
        ))}
      </div>
    </section>
  );
}

type ThemeShape = (typeof THEMES)[number];

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemeShape;
  selected: boolean;
  onSelect: () => void;
}) {
  const swatchKeys: (keyof ThemeShape["tokens"])[] = [
    "bg",
    "surface",
    "line",
    "accent",
  ];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border bg-surface p-3 text-left transition-colors ${
        selected ? "border-accent" : "border-line"
      }`}
      aria-pressed={selected}
    >
      <div className="flex gap-1">
        {swatchKeys.map((k) => (
          <span
            key={k}
            className="h-4 w-4 rounded-[3px] border"
            style={{
              backgroundColor: theme.tokens[k],
              borderColor: theme.tokens.lineStrong,
            }}
          />
        ))}
      </div>
      <div className="mt-3 text-sm font-medium text-foreground">
        {theme.label}
      </div>
    </button>
  );
}

function DefaultsSection({ settings }: { settings: Settings }) {
  const timeValue = `${String(settings.tomorrowHour).padStart(2, "0")}:00`;

  return (
    <section>
      <SectionLabel>DEFAULTS</SectionLabel>

      <Row label="Week starts on">
        <div className="inline-flex rounded-full border border-line bg-surface p-1 text-xs">
          {([
            { value: 1 as const, label: "Mon" },
            { value: 0 as const, label: "Sun" },
          ]).map((opt) => {
            const active = settings.weekStartsOn === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => saveSettings({ weekStartsOn: opt.value })}
                className={`rounded-full px-3 py-1 transition-colors ${
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
      </Row>

      <Row label="Default Tomorrow time">
        <input
          type="time"
          value={timeValue}
          onChange={(e) => {
            const [h] = e.target.value.split(":");
            const hour = Math.max(0, Math.min(23, parseInt(h, 10) || 0));
            saveSettings({ tomorrowHour: hour });
          }}
          className="rounded-md border border-line bg-surface px-2 py-1 text-base text-foreground outline-none"
        />
      </Row>

      <Row label="Default capture area">
        <select
          value={settings.defaultArea ?? ""}
          onChange={(e) =>
            saveSettings({ defaultArea: e.target.value || null })
          }
          className="rounded-md border border-line bg-surface px-2 py-1 text-base text-foreground outline-none"
        >
          <option value="">None</option>
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </Row>
    </section>
  );
}

function NotificationsSection({ settings }: { settings: Settings }) {
  const { state, request } = useNotificationPermission();

  const granted = state === "granted";
  const remindOptions: { value: number; label: string }[] = [
    { value: 0, label: "At due time" },
    { value: 5, label: "5 min before" },
    { value: 15, label: "15 min before" },
    { value: 30, label: "30 min before" },
    { value: 60, label: "1 hour before" },
  ];

  async function handleEnable() {
    tap("light");
    const result = await request();
    if (result === "granted") {
      await registerPushSubscription();
      await fireNotification({
        title: "Tend can now remind you.",
        tag: "tend-welcome",
      });
      if (settings.notificationsEnabled) {
        void syncAllPush();
      }
    }
  }

  async function handleTest() {
    tap("light");
    await fireNotification({
      title: "Test notification",
      body: "If you see this, reminders are working.",
      tag: "tend-test",
    });
  }

  return (
    <section>
      <SectionLabel>NOTIFICATIONS</SectionLabel>

      <Row label="Permission">
        <PermissionPill
          state={state}
          onEnable={handleEnable}
          onTest={handleTest}
        />
      </Row>
      {state === "denied" && (
        <p className="-mt-1 mb-2 text-xs text-muted">
          Enable in your device settings to receive reminders.
        </p>
      )}

      <Row label="Item reminders">
        <Toggle
          checked={settings.notificationsEnabled && granted}
          disabled={!granted}
          onChange={(next) => {
            saveSettings({ notificationsEnabled: next });
            if (next) {
              void (async () => {
                await ensureSubscription();
                await syncAllPush();
              })();
            } else {
              void cancelAllPush();
            }
          }}
          aria-label="Item reminders"
        />
      </Row>

      <Row label="Remind me">
        <select
          value={settings.remindBeforeMinutes}
          disabled={!settings.notificationsEnabled || !granted}
          onChange={(e) => {
            saveSettings({ remindBeforeMinutes: parseInt(e.target.value, 10) });
            if (settings.notificationsEnabled && granted) {
              void syncAllPush();
            }
          }}
          className="rounded-md border border-line bg-surface px-2 py-1 text-base text-foreground outline-none disabled:opacity-40"
        >
          {remindOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Morning ritual">
        <Toggle
          checked={settings.morningRitualEnabled}
          onChange={(next) => saveSettings({ morningRitualEnabled: next })}
          aria-label="Morning ritual"
        />
      </Row>
      {settings.morningRitualEnabled && (
        <div className="flex items-center justify-between gap-4 py-2 pl-4">
          <span className="text-xs text-muted">Time</span>
          <input
            type="time"
            value={settings.morningRitualTime}
            onChange={(e) =>
              saveSettings({ morningRitualTime: e.target.value })
            }
            className="rounded-md border border-line bg-surface px-2 py-1 text-base text-foreground outline-none"
          />
        </div>
      )}

      <Row label="Evening ritual">
        <Toggle
          checked={settings.eveningRitualEnabled}
          onChange={(next) => saveSettings({ eveningRitualEnabled: next })}
          aria-label="Evening ritual"
        />
      </Row>
      {settings.eveningRitualEnabled && (
        <div className="flex items-center justify-between gap-4 py-2 pl-4">
          <span className="text-xs text-muted">Time</span>
          <input
            type="time"
            value={settings.eveningRitualTime}
            onChange={(e) =>
              saveSettings({ eveningRitualTime: e.target.value })
            }
            className="rounded-md border border-line bg-surface px-2 py-1 text-base text-foreground outline-none"
          />
        </div>
      )}
    </section>
  );
}

function PermissionPill({
  state,
  onEnable,
  onTest,
}: {
  state: PermissionState;
  onEnable: () => void;
  onTest: () => void;
}) {
  if (state === "unsupported") {
    return (
      <span className="text-xs text-muted">Not supported on this device</span>
    );
  }
  if (state === "default") {
    return (
      <button
        type="button"
        onClick={onEnable}
        className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
      >
        Enable
      </button>
    );
  }
  if (state === "granted") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Enabled</span>
        <button
          type="button"
          onClick={onTest}
          className="rounded-full bg-surface-2 px-3 py-1 text-xs text-foreground"
        >
          Test notification
        </button>
      </div>
    );
  }
  return <span className="text-xs text-danger">Blocked</span>;
}

function DataSection() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  async function handleExport() {
    const items = await db.items.toArray();
    let settingsRaw: unknown = null;
    try {
      const raw = window.localStorage.getItem("tend.settings");
      settingsRaw = raw ? JSON.parse(raw) : null;
    } catch {
      settingsRaw = null;
    }
    const payload = {
      app: "tend",
      version: 1,
      exportedAt: Date.now(),
      items,
      settings: settingsRaw,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tend-export-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    setImportMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        items?: Item[];
        settings?: unknown;
      };

      let added = 0;
      if (Array.isArray(parsed.items)) {
        const existingIds = new Set(
          (await db.items.toArray()).map((i) => i.id)
        );
        const fresh = parsed.items.filter(
          (i) => i && typeof i.id === "string" && !existingIds.has(i.id)
        );
        if (fresh.length > 0) {
          await db.items.bulkAdd(fresh);
          added = fresh.length;
        }
      }

      if (parsed.settings && typeof parsed.settings === "object") {
        window.localStorage.setItem(
          "tend.settings",
          JSON.stringify(parsed.settings)
        );
        window.dispatchEvent(
          new StorageEvent("storage", { key: "tend.settings" })
        );
      }

      setImportMessage(`Imported ${added} item${added === 1 ? "" : "s"}`);
    } catch {
      setImportMessage("Couldn’t read that file");
    }
  }

  async function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      confirmTimerRef.current = setTimeout(() => {
        setConfirmClear(false);
      }, 3000);
      return;
    }
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    await db.items.clear();
    clearSettings();
    router.push("/today");
  }

  return (
    <section>
      <SectionLabel>DATA</SectionLabel>
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-full border border-line-strong bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-2"
        >
          Export all data
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-line-strong bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-2"
        >
          Import from JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImport(f);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={handleClear}
          className="rounded-full border border-danger bg-transparent px-4 py-2 text-sm text-danger transition-colors hover:bg-surface"
        >
          {confirmClear ? "Tap again — this deletes all items" : "Clear all data"}
        </button>
      </div>

      {importMessage && (
        <p className="mt-3 text-xs text-muted">{importMessage}</p>
      )}
    </section>
  );
}

function AboutSection() {
  return (
    <section>
      <SectionLabel>ABOUT</SectionLabel>
      <p className="text-xs text-faint">Tend · v0.1.0</p>
      <p className="text-xs text-faint">
        Built with care · Local-first · Your data never leaves this device
      </p>
    </section>
  );
}

type DiagStatus = "pass" | "fail" | "skip";
type DiagStep = { step: string; status: DiagStatus; detail: string };
type DiagResult = { ok: boolean; steps: DiagStep[] };

const TOTAL_CHECKS = 8;

function DiagnosticsSection() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DiagResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reregistering, setReregistering] = useState(false);
  const [reregisterMessage, setReregisterMessage] = useState<string | null>(null);

  async function handleReregister() {
    tap("light");
    setReregistering(true);
    setReregisterMessage(null);
    try {
      const ok = await ensureSubscription();
      setReregisterMessage(
        ok
          ? "Subscription registered"
          : getLastSubscriptionError() ?? "Subscription registration failed",
      );
    } finally {
      setReregistering(false);
    }
  }

  async function handleRun() {
    tap("light");
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      // Give the diagnostics a fresh chance to pass by ensuring the backend
      // has a current subscription before we test the chain.
      await ensureSubscription();
      const res = await fetch("/api/notifications/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as DiagResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const failCount = result
    ? result.steps.filter((s) => s.status === "fail").length
    : 0;
  const step8Passed =
    result?.steps.some(
      (s) => s.step === "Send test push immediately" && s.status === "pass",
    ) ?? false;

  return (
    <section>
      <SectionLabel>DIAGNOSTICS</SectionLabel>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="rounded-full bg-surface-2 px-3 py-2 text-xs text-foreground disabled:opacity-50"
        >
          {running ? "Running…" : "Run push diagnostics"}
        </button>
        <button
          type="button"
          onClick={handleReregister}
          disabled={reregistering}
          className="rounded-full bg-surface-2 px-3 py-2 text-xs text-foreground disabled:opacity-50"
        >
          {reregistering ? "Registering…" : "Re-register subscription"}
        </button>
      </div>

      {reregisterMessage && (
        <p
          className={`mt-3 text-xs ${
            reregisterMessage === "Subscription registered"
              ? "text-accent"
              : "text-danger"
          }`}
        >
          {reregisterMessage}
        </p>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-3">
          <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-danger" />
          <div>
            <p className="text-sm text-foreground">
              Diagnostic endpoint unreachable
            </p>
            <p className="text-xs text-muted">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <p
            className={`text-sm ${
              failCount === 0 ? "text-accent" : "text-danger"
            }`}
          >
            {failCount === 0
              ? `All ${TOTAL_CHECKS} checks passed`
              : `${failCount} of ${TOTAL_CHECKS} checks failed`}
          </p>

          <div className="mt-3 flex flex-col gap-3">
            {result.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${
                    s.status === "pass"
                      ? "bg-accent"
                      : s.status === "fail"
                        ? "bg-danger"
                        : "bg-faint"
                  }`}
                />
                <div>
                  <p className="text-sm text-foreground">{s.step}</p>
                  {s.detail && (
                    <p className="text-xs text-muted">{s.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {step8Passed && (
            <p className="mt-3 text-xs text-muted">
              Step 8 sent a real push — check your phone.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
