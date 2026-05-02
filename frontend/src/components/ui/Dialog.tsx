'use client';

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

type ConfirmOpts = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger';
};

type PendingConfirm = ConfirmOpts & {
  resolve: (ok: boolean) => void;
};

type DialogContextValue = {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...opts, resolve });
      }),
    [],
  );

  const handleResolve = useCallback(
    (ok: boolean) => {
      if (!pending) return;
      pending.resolve(ok);
      setPending(null);
    },
    [pending],
  );

  // Esc to cancel
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleResolve(false);
      if (e.key === 'Enter') handleResolve(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, handleResolve]);

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          <div
            className="absolute inset-0 bg-fg/40 backdrop-blur-sm"
            onClick={() => handleResolve(false)}
          />
          <div
            className={cn(
              'relative bg-elevated text-card-fg rounded-lg border border-border shadow-xl max-w-md w-full p-5 space-y-4',
            )}
          >
            <div>
              <h2 id="dialog-title" className="text-base font-semibold tracking-tight">
                {pending.title}
              </h2>
              {pending.description && (
                <p className="text-sm text-muted-fg mt-1.5 leading-relaxed">
                  {pending.description}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResolve(false)}
              >
                {pending.cancelText || 'Batal'}
              </Button>
              <Button
                variant={pending.tone === 'danger' ? 'danger' : 'default'}
                size="sm"
                onClick={() => handleResolve(true)}
                autoFocus
              >
                {pending.confirmText || 'OK'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useConfirm must be used within DialogProvider');
  return ctx.confirm;
}
