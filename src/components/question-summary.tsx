'use client';

import { useMemo } from 'react';
import { summarizeQuestion } from '@/lib/analytics';
import { QUESTION_TYPE_MAP } from '@/lib/constants';
import { pluralize, timeAgo } from '@/lib/utils';
import type { FormResponse, Question } from '@/lib/types';
import { Stars } from '@/components/stars';

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
        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
          <div className="shrink-0">
            <p className="font-display text-4xl font-extrabold leading-none tracking-tight">
              {summary.average.toFixed(1)}
              <span className="text-base font-semibold text-ink/35"> / {question.maxRating}</span>
            </p>
            <Stars value={summary.average} max={question.maxRating} className="mt-2.5" />
            <p className="mt-1.5 text-xs text-ink/45">{pluralize(summary.count, 'rating')}</p>
          </div>
          <div className="flex-1 space-y-2">
            {summary.distribution.map((d, i) => (
              <div key={d.value} className="flex items-center gap-3">
                <span className="w-9 font-mono text-[11px] text-ink/45">{d.value} ★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div
                    className="animate-grow-x h-full rounded-full bg-ballpoint-500"
                    style={{
                      width: d.count ? `${Math.max(4, (d.count / summary.count) * 100)}%` : '0%',
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                </div>
                <span className="w-6 text-right font-mono text-[11px] text-ink/45">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {summary.kind === 'choice' ? (
        <div className="mt-5 space-y-3.5">
          {summary.bars.map((b, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-ink/75">{b.label}</span>
                <span className="shrink-0 font-mono text-[11px] text-ink/45">
                  {b.count} · {b.pct}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                <div
                  className="animate-grow-x h-full rounded-full bg-ballpoint-500"
                  style={{ width: `${b.pct}%`, animationDelay: `${i * 70}ms` }}
                />
              </div>
            </div>
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
