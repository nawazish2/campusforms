'use client';

import { useMemo } from 'react';
import { summarizeQuestion } from '@/lib/analytics';
import { QUESTION_TYPE_MAP } from '@/lib/constants';
import { cn, pluralize, timeAgo } from '@/lib/utils';
import type { FormResponse, Question } from '@/lib/types';
import { Stars } from '@/components/stars';

/**
 * One result row. The fill is the row itself rather than a separate track
 * underneath it: a hairline bar stretched across the card put the count an
 * inch away from the label it belonged to, and made one response look like a
 * chart. Here the row is the unit, so the label and its number stay together
 * however wide the card gets.
 */
function ResultRow({
  label,
  value,
  pct,
  lead,
  delay,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  pct: number;
  lead?: boolean;
  delay: number;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-lg">
      {pct > 0 ? (
        <div
          className={cn(
            'animate-grow-x absolute inset-y-0 left-0 -z-10 rounded-lg',
            lead ? 'bg-ballpoint-500/15' : 'bg-ballpoint-500/[0.08]'
          )}
          style={{ width: `${Math.max(pct, 1.5)}%`, animationDelay: `${delay}ms` }}
        />
      ) : null}
      <div className="flex items-baseline justify-between gap-4 px-2.5 py-2">
        <span
          className={cn(
            'min-w-0 truncate text-[13px]',
            pct > 0 ? 'font-medium text-ink/80' : 'text-ink/40'
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'shrink-0 font-mono text-[11px] tabular-nums',
            pct > 0 ? 'text-ink/60' : 'text-ink/30'
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

/**
 * A five-point scale is an axis, so it gets drawn as one. As five stacked
 * rows the counts ended up stranded a card's width from the bar they
 * belonged to, and an empty rating still claimed a full row.
 */
function Histogram({
  distribution,
  total,
}: {
  distribution: { value: number; count: number }[];
  total: number;
}) {
  const peak = Math.max(1, ...distribution.map((d) => d.count));
  // Ascending, so the axis reads left to right like any other scale.
  const columns = [...distribution].sort((a, b) => a.value - b.value);

  return (
    <div className="min-w-0 flex-1">
      <div className="flex h-24 items-end gap-1.5">
        {columns.map((d, i) => (
          <div key={d.value} className="flex h-full flex-1 flex-col justify-end">
            <span
              className={cn(
                'mb-1 text-center font-mono text-[11px] tabular-nums',
                d.count ? 'text-ink/55' : 'text-ink/25'
              )}
            >
              {d.count}
            </span>
            <div
              className={cn(
                'animate-grow-y rounded-t-md',
                d.count === peak ? 'bg-ballpoint-500/30' : 'bg-ballpoint-500/15'
              )}
              style={{
                height: d.count ? `${Math.max((d.count / peak) * 100, 8)}%` : '2px',
                animationDelay: `${i * 60}ms`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 border-t border-ink/[0.09] pt-1.5">
        {columns.map((d) => (
          <span
            key={d.value}
            className="flex-1 text-center font-mono text-[11px] text-ink/45"
          >
            {d.value}★
          </span>
        ))}
      </div>
      <p className="sr-only">
        {columns.map((d) => `${d.value} stars: ${d.count} of ${total}`).join(', ')}
      </p>
    </div>
  );
}

export function QuestionSummaryCard({
  question,
  responses,
  index,
}: {
  question: Question;
  responses: FormResponse[];
  index: number;
}) {
  const summary = useMemo(
    () => summarizeQuestion(question, responses),
    [question, responses]
  );
  const meta = QUESTION_TYPE_MAP[question.type];

  // Only worth calling out a leader once something is actually ahead.
  const topChoice =
    summary.kind === 'choice'
      ? Math.max(0, ...summary.bars.map((b) => b.count))
      : 0;
  const hasLeader =
    summary.kind === 'choice' &&
    topChoice > 0 &&
    summary.bars.filter((b) => b.count === topChoice).length === 1;

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-xs font-medium text-ink/35">Q{index + 1}</span>
        <h3 className="text-sm font-semibold text-ink">
          {question.title || <span className="text-ink/35">Untitled question</span>}
        </h3>
        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink/30">
          {meta.label}
        </span>
      </div>

      {summary.kind === 'rating' ? (
        <div className="mt-5 flex items-end gap-6">
          <div className="shrink-0">
            <p className="font-display text-4xl font-extrabold leading-none tracking-tight">
              {summary.average.toFixed(1)}
              <span className="text-base font-semibold text-ink/35"> / {question.maxRating}</span>
            </p>
            <Stars value={summary.average} max={question.maxRating} className="mt-2.5" />
            <p className="mt-1.5 text-xs text-ink/45">
              {pluralize(summary.count, 'rating')}
            </p>
          </div>
          <Histogram distribution={summary.distribution} total={summary.count} />
        </div>
      ) : null}

      {summary.kind === 'choice' ? (
        <div className="mt-4 max-w-xl space-y-0.5">
          {summary.bars.map((b, i) => (
            <ResultRow
              key={i}
              label={b.label}
              value={`${b.count} · ${b.pct}%`}
              pct={b.pct}
              lead={hasLeader && b.count === topChoice}
              delay={i * 70}
            />
          ))}
        </div>
      ) : null}

      {summary.kind === 'text' ? (
        summary.count === 0 ? (
          <p className="mt-5 text-sm text-ink/40">No answers yet.</p>
        ) : (
          <div className="mt-5 max-h-72 space-y-4 overflow-y-auto pr-1">
            {summary.answers.map((a, i) => (
              <blockquote key={i} className="border-l-2 border-ballpoint-200 pl-3.5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                  {a.value}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink/35">
                  {a.respondent ?? 'Anonymous'} · {timeAgo(a.submittedAt)}
                </p>
              </blockquote>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
