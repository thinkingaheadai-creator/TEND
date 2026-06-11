'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function InstallHint() {
  const [show, setShow] = useState(false);
  const [variant, setVariant] = useState<'ios' | 'android' | null>(null);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissed = localStorage.getItem('tend.installHint.dismissed') === '1';
    if (dismissed) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);

    if (isIOS) {
      setVariant('ios');
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVariant('android');
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem('tend.installHint.dismissed', '1');
    setShow(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') dismiss();
  };

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
          className="rounded-full p-1 text-muted hover:bg-surface-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
