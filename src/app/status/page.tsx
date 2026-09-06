'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EyeOff, FileQuestion, Search } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CategoryBadge } from '@/components/category-badge';
import { Stars } from '@/components/stars';
import { Button } from '@/components/ui/button';
import { useDb } from '@/lib/db/hooks';
import { lookupResponseByRef } from '@/lib/db/forms';
import { RESPONSE_STATUS_META } from '@/lib/constants';
import { answerToText, cn, fmtDateTime } from '@/lib/utils';
import type { AnswerValue, Question, ResponseStatus } from '@/lib/types';

type LookupResult = NonNullable<Awaited<ReturnType<typeof lookupResponseByRef>>>;

/** REF codes are the last six characters of a response id — letters+digits. */
function normalizeRef(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export default function StatusPage() {
  const db = useDb();
  const [ref, setRef] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [lookedUpRef, setLookedUpRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deep link from the success screen: /status?ref=ABC123
  useEffect(() => {
    const fromUrl = normalizeRef(new URLSearchParams(window.location.search).get('ref') ?? '');
    if (fromUrl.length === 6) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot URL hydration; track() flips loading state before its first await.
      setRef(fromUrl);
      void track(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track reads db/state refs that are stable for the page's life.
  }, []);

  async function track(code: string) {
    const clean = normalizeRef(code);
    if (clean.length !== 6) {
      setError('A REF code is six letters and numbers, like ABC123.');
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    setResult(null);
    try {
      const found = await lookupResponseByRef(db, clean);
      if (found) {
        setResult(found);
        setLookedUpRef(clean);
      } else {
        setNotFound(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That lookup didn’t go through. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const status = result?.response_status as ResponseStatus | undefined;
  const statusMeta = status ? RESPONSE_STATUS_META[status] : null;

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ballpoint-700">
            Track your response
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
            Where did it go?
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
            Every submission gets a REF code. Enter it to see where your
            response sits in the organizer’s queue — no sign-in needed.
          </p>
        </div>

        <form
          className="mx-auto mt-7 flex max-w-md items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void track(ref);
          }}
        >
          <div className="relative flex-1">
            <input
              value={ref}
              onChange={(e) => setRef(normalizeRef(e.target.value))}
              placeholder="ABC123"
              aria-label="Your REF code"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="h-12 w-full rounded-xl border border-ink/10 bg-card text-center font-mono text-lg font-semibold uppercase tracking-[0.3em] text-ink shadow-sm outline-none transition placeholder:tracking-normal placeholder:text-ink/30 focus:border-ballpoint-400 focus:ring-2 focus:ring-ballpoint-500/20"
            />
          </div>
          <Button size="lg" type="submit" disabled={loading || ref.length !== 6}>
            <Search />
            {loading ? 'Looking…' : 'Track'}
          </Button>
        </form>

        {error ? (
          <p className="mx-auto mt-4 max-w-md text-center text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {notFound ? (
          <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-ink/[0.08] bg-card px-6 py-12 text-center shadow-sm">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-ink/[0.05]">
              <FileQuestion className="size-7 text-ink/40" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold tracking-tight">
              Nothing with that code
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/55">
              {lookedUpRef
                ? `No response matches REF #${lookedUpRef}. Double-check the six characters from your confirmation screen.`
                : 'Check the code on your confirmation screen and try again.'}
            </p>
          </div>
        ) : null}

        {result && statusMeta ? (
          <div className="animate-pop mx-auto mt-8 max-w-xl rounded-3xl border border-ink/[0.08] bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-ink/[0.07] px-6 py-4 sm:px-8">
              <CategoryBadge category={result.form_category} />
              <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-ink/35">
                REF #{lookedUpRef}
              </span>
            </div>
            <div className="p-6 sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink/40">
                {result.form_title}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold',
                    statusMeta.chip
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  {statusMeta.label}
                </span>
                <span className="font-mono text-[11px] text-ink/45">
                  Submitted {fmtDateTime(result.submitted_at)}
                </span>
              </div>

              {result.is_anonymous ? (
                <p className="mt-5 flex items-start gap-2.5 rounded-xl border border-ballpoint-200 bg-ballpoint-50 px-4 py-3 text-sm leading-relaxed text-ballpoint-900">
                  <EyeOff className="mt-0.5 size-4 shrink-0 text-ballpoint-600" aria-hidden />
                  This was an anonymous response, so the details stay private —
                  even from this page. The organizer sees your status above.
                </p>
              ) : (
                <AnswersList answers={result.answers ?? {}} questions={result.form_questions ?? []} />
              )}
            </div>
          </div>
        ) : null}

        <p className="mt-10 text-center text-sm text-ink/45">
          Lost the code? It’s on the confirmation screen from when you
          submitted.{' '}
          <Link href="/browse" className="font-medium text-ballpoint-700 hover:underline">
            Browse open forms
          </Link>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}

function AnswersList({
  answers,
  questions,
}: {
  answers: Record<string, AnswerValue>;
  questions: Question[];
}) {
  return (
    <dl className="mt-6 divide-y divide-ink/[0.06] border-t border-ink/[0.06]">
      {questions.map((q) => (
        <div key={q.id} className="grid gap-1 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
          <dt className="text-[13px] leading-snug text-ink/45">{q.title}</dt>
          <dd className="min-w-0 text-sm">
            <Answer answer={answers[q.id]} question={q} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Answer({ answer, question }: { answer: AnswerValue | undefined; question: Question }) {
  if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
    return <span className="text-ink/30">—</span>;
  }
  if (question.type === 'rating' && typeof answer === 'number') {
    return (
      <span className="flex items-center gap-2">
        <Stars value={answer} max={question.maxRating} />
        <span className="font-mono text-xs text-ink/50">
          {answer}/{question.maxRating}
        </span>
      </span>
    );
  }
  if (Array.isArray(answer)) {
    return <span className="font-medium text-ink/85">{answer.join(' · ')}</span>;
  }
  return (
    <span className="whitespace-pre-wrap font-medium text-ink/85">
      {answerToText(answer, question)}
    </span>
  );
}
