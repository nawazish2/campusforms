'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
  describedBy?: string;
}

export function StarInput({ value, onChange, max = 5, disabled, describedBy }: StarInputProps) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  // A radiogroup is one tab stop: Tab lands on the current rating (or the
  // first star when unrated) and the arrows move between them, as they do
  // in a native radio group.
  const focusStar = (group: HTMLElement | null, v: number) => {
    const target = group?.querySelectorAll('button')[v - 1];
    if (target instanceof HTMLElement) target.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, v: number) => {
    let next = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = v === max ? 1 : v + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = v === 1 ? max : v - 1;
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = max;
    else return;
    e.preventDefault();
    onChange(next);
    focusStar(e.currentTarget.parentElement, next);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-0.5"
      role="radiogroup"
      aria-label={`Rating out of ${max}`}
      aria-describedby={describedBy}
      onMouseLeave={() => setHover(0)}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          aria-label={`${v} of ${max}`}
          disabled={disabled}
          tabIndex={v === (value || 1) ? 0 : -1}
          onKeyDown={(e) => onKeyDown(e, v)}
          onMouseEnter={() => setHover(v)}
          onClick={() => onChange(v)}
          className={cn(
            'rounded-md p-[7px] outline-none sm:p-0.5 transition-transform focus-visible:ring-2 focus-visible:ring-ring',
            !disabled && 'hover:scale-110 active:scale-95'
          )}
        >
          <Star
            key={v === value ? `on-${value}` : 'off'}
            className={cn(
              'size-7 transition-colors',
              v <= active ? 'fill-marker-strong text-[#d9a514]' : 'text-ink/30',
              v === value && 'animate-star-pop'
            )}
          />
        </button>
      ))}
      {active > 0 ? (
        <span className="ml-2 font-mono text-xs text-ink/60">
          {active}/{max}
        </span>
      ) : null}
    </div>
  );
}

export function Stars({
  value,
  max = 5,
  className,
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
        <Star
          key={v}
          aria-hidden
          className={cn(
            'size-4',
            v <= Math.round(value) ? 'fill-marker-strong text-[#d9a514]' : 'text-ink/30'
          )}
        />
      ))}
    </span>
  );
}
