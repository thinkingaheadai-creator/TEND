'use client';
import { useSyncExternalStore } from 'react';
import { X } from 'lucide-react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Variant = 'ios' | 'android' | null;
type HintState = { show: boolean; variant: Variant };

const HIDDEN: HintState = { show: false, variant: null };
const DISMISS_KEY = 'tend.installHint.dismissed';

// Module-level store so the install-hint decision is read via
// useSyncExternalStore: the server snapshot is always hidden (matching SSR),
// and the client switches to the real value after mount — same end-state as the
// original effect, but without a synchronous setState inside an effect.
let deferred: BIPEvent | null = null;
let dismissed = false;
let started = false;
let snapshot: HintState = HIDDEN;
const listeners = new Set<() => void>();

function computeSnapshot(): HintState {
  if (typeof window === 'undefined') return HIDDEN;

  if (dismissed || localStorage.getItem(DISMISS_KEY) === '1') return HIDDEN;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (isStandalone) return HIDDEN;

  const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
  if (isIOS) return { show: true, variant: 'ios' };

  if (deferred) return { show: true, variant: 'android' };

  return HIDDEN;
}

function emit() {
  snapshot = computeSnapshot();
  for (const l of listeners) l();
}

function onBeforeInstallPrompt(e: Event) {
  e.preventDefault();
  deferred = e as BIPEvent;
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (!started) {
    started = true;
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    snapshot = computeSnapshot();
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      started = false;
    }
  };
}

function getSnapshot(): HintState {
  return snapshot;
}

function getServerSnapshot(): HintState {
  return HIDDEN;
}

function dismiss() {
  dismissed = true;
  if (typeof window !== 'undefined') localStorage.setItem(DISMISS_KEY, '1');
  emit();
}

async function install() {
  if (!deferred) return;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  if (outcome === 'accepted') dismiss();
}

export default function InstallHint() {
  const { show, variant } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!show) return null;

  return (
    <div className="mb-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1 text-foreground">
          {variant === 'ios' ? (
            <>
              <div className="font-medium">Add Tend to your home screen</div>
              <div className="mt-1 text-xs text-muted">
                Tap the Share icon, then &ldquo;Add to Home Screen&rdquo; for the full app experience.
              </div>
            </>
          ) : (
            <>
              <div className="font-medium">Install Tend</div>
              <div className="mt-1 text-xs text-muted">
                Get the full app experience with home screen access.
              </div>
              <button
                type="button"
                onClick={install}
                className="mt-2 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
              >
                Install
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-1 text-muted hover:bg-surface-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
