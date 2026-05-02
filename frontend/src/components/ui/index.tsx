import {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
} from 'react';
import { cn } from '@/lib/cn';

export function Badge({ className, ...p }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[11px] rounded-md font-medium border border-transparent',
        className,
      )}
      {...p}
    />
  );
}

const inputClasses =
  'h-9 w-full rounded-md border border-border bg-bg/40 px-3 text-sm placeholder:text-muted-fg/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input ref={ref} className={cn(inputClasses, className)} {...p} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[100px] w-full rounded-md border border-border bg-bg/40 px-3 py-2 text-sm placeholder:text-muted-fg/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        className,
      )}
      {...p}
    />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...p }, ref) => (
    <select ref={ref} className={cn(inputClasses, 'appearance-none pr-8', className)} {...p} />
  ),
);
Select.displayName = 'Select';

export function Label({ className, ...p }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-[11px] font-medium uppercase tracking-wide text-muted-fg',
        className,
      )}
      {...p}
    />
  );
}

export function Skeleton({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse-soft rounded-md bg-muted', className)}
      {...p}
    />
  );
}

export function Divider({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('h-px bg-border', className)} {...p} />;
}
