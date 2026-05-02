'use client';

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/* -------------------------------------------------------------------------- */
/* Provider (currently a no-op context — exists for future extensibility)     */
/* -------------------------------------------------------------------------- */

type ShortcutsContextValue = {
  // reserved for future expansion (e.g., dynamic registration map)
  readonly version: 1;
};

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  return (
    <ShortcutsContext.Provider value={{ version: 1 }}>
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts(): ShortcutsContextValue {
  const ctx = useContext(ShortcutsContext);
  if (!ctx) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return ctx;
}

/* -------------------------------------------------------------------------- */
/* useShortcut hook                                                           */
/* -------------------------------------------------------------------------- */

type ShortcutOpts = {
  /** If true, fire even when typing into an input/textarea (rare). Default false. */
  allowInInputs?: boolean;
  /** If false, the listener is unbound. */
  enabled?: boolean;
};

/**
 * Register a global keydown listener for a single key.
 * Skips when the user is typing in INPUT / TEXTAREA / [contenteditable].
 * Re-binds whenever `key` or `handler` changes.
 */
export function useShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  opts?: ShortcutOpts,
): void {
  const { allowInInputs = false, enabled = true } = opts ?? {};

  // Keep the latest handler in a ref so we don't rebind every render if the
  // caller passes an inline function. We *do* rebind when `key` changes.
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== key) return;
      if (!allowInInputs && isTypingTarget(e.target)) return;
      handlerRef.current(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, allowInInputs, enabled]);
}

/* -------------------------------------------------------------------------- */
/* Help dialog                                                                */
/* -------------------------------------------------------------------------- */

type ShortcutEntry = {
  keys: string[];
  label: string;
};

const SHORTCUT_GROUPS: Array<{ title: string; entries: ShortcutEntry[] }> = [
  {
    title: 'Global',
    entries: [
      { keys: ['?'], label: 'Show this help' },
      { keys: ['g', 'h'], label: 'Go to Dashboard' },
      { keys: ['g', 'l'], label: 'Go to Leads' },
      { keys: ['g', 'o'], label: 'Go to Outreach' },
      { keys: ['g', 't'], label: 'Go to Templates' },
      { keys: ['g', 's'], label: 'Go to Settings' },
      { keys: ['Esc'], label: 'Close dialog' },
    ],
  },
  {
    title: 'Leads list',
    entries: [
      { keys: ['j'], label: 'Next lead' },
      { keys: ['k'], label: 'Previous lead' },
      { keys: ['Enter'], label: 'Open focused lead' },
    ],
  },
  {
    title: 'Lead detail',
    entries: [
      { keys: ['e'], label: 'Run enrichment' },
      { keys: ['g'], label: 'Compose tab + generate message' },
    ],
  },
];

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border border-border bg-muted text-[11px] font-mono text-fg">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kbd-help-title"
    >
      <div
        className="absolute inset-0 bg-fg/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'relative bg-elevated text-card-fg rounded-lg border border-border shadow-xl max-w-md w-full p-5 space-y-4',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="kbd-help-title" className="text-base font-semibold tracking-tight">
              Keyboard shortcuts
            </h2>
            <p className="text-xs text-muted-fg mt-1">
              Tekan <Kbd>?</Kbd> kapan saja untuk membuka panel ini.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Tutup"
          >
            Esc
          </Button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[11px] uppercase tracking-wide font-medium text-muted-fg mb-2">
                {group.title}
              </p>
              <ul className="space-y-1.5">
                {group.entries.map((entry) => (
                  <li
                    key={entry.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-fg">{entry.label}</span>
                    <span className="flex items-center gap-1">
                      {entry.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-muted-fg text-xs">then</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Root: wires global shortcuts (`?`, Esc, `g <x>` two-key sequences)         */
/* -------------------------------------------------------------------------- */

const SEQUENCE_TIMEOUT_MS = 1500;

const G_SEQUENCE_ROUTES: Record<string, string> = {
  h: '/',
  l: '/leads',
  o: '/outreach',
  t: '/templates',
  s: '/settings',
};

export default function KeyboardShortcutsRoot() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  // Two-key sequence state: when `g` is pressed, this records the timer id.
  const gPendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gActiveRef = useRef<boolean>(false);

  const cancelGSequence = useCallback(() => {
    if (gPendingRef.current) {
      clearTimeout(gPendingRef.current);
      gPendingRef.current = null;
    }
    gActiveRef.current = false;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Never hijack typing.
      if (isTypingTarget(e.target)) {
        // If user starts typing mid-sequence, cancel pending `g`.
        if (gActiveRef.current) cancelGSequence();
        return;
      }

      // If help dialog is open, the dialog handles Esc itself.
      // Don't fire shortcuts that would interfere.
      if (helpOpen) return;

      // ? -> open help
      if (e.key === '?') {
        e.preventDefault();
        cancelGSequence();
        setHelpOpen(true);
        return;
      }

      // Two-key sequence: `g` then <letter>
      if (gActiveRef.current) {
        const target = G_SEQUENCE_ROUTES[e.key];
        if (target) {
          e.preventDefault();
          cancelGSequence();
          router.push(target);
          return;
        }
        // Any other key cancels the pending `g`.
        cancelGSequence();
        // Fall through — do not consume the key.
      }

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        gActiveRef.current = true;
        if (gPendingRef.current) clearTimeout(gPendingRef.current);
        gPendingRef.current = setTimeout(() => {
          gActiveRef.current = false;
          gPendingRef.current = null;
        }, SEQUENCE_TIMEOUT_MS);
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (gPendingRef.current) clearTimeout(gPendingRef.current);
    };
  }, [router, helpOpen, cancelGSequence]);

  return (
    <KeyboardShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
  );
}
