import { HTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

export function Badge({ className, ...p }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 text-xs rounded-md font-medium', className)}
      {...p}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-1 focus:ring-fg/30 transition',
        className,
      )}
      {...p}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[100px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-fg/30 transition',
        className,
      )}
      {...p}
    />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...p }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-1 focus:ring-fg/30',
        className,
      )}
      {...p}
    />
  ),
);
Select.displayName = 'Select';

export function Label({ className, ...p }: HTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-xs font-medium text-muted-fg', className)} {...p} />;
}
