'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { LucideIcon } from 'lucide-react';

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  );
}

/** Eased count-up that respects reduced motion and re-animates on change. */
function useCountUp(target: number, duration = 800): number {
  const reduce = usePrefersReducedMotion();
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) {
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);

  return reduce ? target : display;
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: LucideIcon;
  /** Marks the one stat that matters most right now — a solid ballpoint card among neutral ones. */
  accent?: boolean;
}) {
  const numeric = typeof value === 'number' ? value : null;
  const shown = useCountUp(numeric ?? 0);

  return (
    <div
      className={
        accent
          ? 'rounded-2xl bg-ballpoint-600 p-5 text-white shadow-md transition-shadow hover:shadow-lg'
          : 'rounded-2xl border border-ink/10 bg-card p-5 shadow-sm transition-shadow hover:shadow-md'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={
            accent
              ? 'truncate font-mono text-[11px] uppercase tracking-wider text-white/70'
              : 'truncate font-mono text-[11px] uppercase tracking-wider text-ink/50'
          }
        >
          {label}
        </p>
        <Icon className={accent ? 'size-4 shrink-0 text-white/70' : 'size-4 shrink-0 text-ink/30'} aria-hidden />
      </div>
      <p className="mt-2 font-display text-[26px] font-bold leading-none tracking-tight tabular-nums">
        {numeric === null ? value : shown.toLocaleString('en-US')}
      </p>
      {sub ? (
        <p className={accent ? 'mt-1.5 text-[13px] text-white/70' : 'mt-1.5 text-[13px] text-ink/50'}>{sub}</p>
      ) : null}
    </div>
  );
}
