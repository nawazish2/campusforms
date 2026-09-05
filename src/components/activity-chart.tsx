'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { pluralize } from '@/lib/utils';
import type { FormResponse } from '@/lib/types';

/** Responses per day for the last two weeks, as slim vertical bars. */
export function ActivityChart({ responses }: { responses: FormResponse[] }) {
  const days = useMemo(() => {
    const out: { key: string; letter: string; full: string; count: number; isToday: boolean }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const count = responses.filter((r) => {
        const t = new Date(r.submittedAt).getTime();
        return t >= d.getTime() && t < next.getTime();
      }).length;
      out.push({
        key: d.toISOString(),
        letter: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        full: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
        isToday: i === 0,
      });
    }
    return out;
  }, [responses]);

  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/45">
          Last 14 days
        </p>
        <p className="font-mono text-[11px] text-ink/45">{pluralize(total, 'response')}</p>
      </div>

      <div className="mt-5 flex h-28 items-end gap-1.5">
        {days.map((d) => (
          <div
            key={d.key}
            className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            title={`${d.full} — ${pluralize(d.count, 'response')}`}
          >
            {d.count > 0 ? (
              <span className="font-mono text-[10px] text-ink/40 opacity-0 transition group-hover:opacity-100">
                {d.count}
              </span>
            ) : null}
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn(
                  'animate-grow-x w-full rounded-t-[4px]',
                  d.count === 0
                    ? 'h-[3px] bg-ink/[0.08]'
                    : d.isToday
                      ? 'bg-ballpoint-600'
                      : 'bg-ballpoint-300'
                )}
                style={{
                  height: d.count === 0 ? undefined : `${Math.max(12, (d.count / max) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {days.map((d) => (
          <span
            key={d.key}
            className={cn(
              'flex-1 text-center font-mono text-[10px]',
              d.isToday ? 'font-bold text-ballpoint-700' : 'text-ink/35'
            )}
          >
            {d.letter}
          </span>
        ))}
      </div>
    </section>
  );
}
