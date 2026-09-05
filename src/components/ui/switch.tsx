'use client';

import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function Switch({ checked, onCheckedChange, className, disabled, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-50',
        checked ? 'bg-ballpoint-600' : 'bg-ink/15',
        className
      )}
      {...rest}
    >
      <span
        className={cn(
          'pointer-events-none block size-[18px] rounded-full bg-card shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  );
}
