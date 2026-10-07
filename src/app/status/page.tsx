'use client';

import { useEffect, useState } from 'react';
import type { FunctionReturnType } from 'convex/server';
import Link from 'next/link';
import { EyeOff, FileQuestion, Search } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CategoryBadge } from '@/components/category-badge';
import { Button } from '@/components/ui/button';
import { useConvex } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { errorMessage } from '@/lib/db/actions';
import { RESPONSE_STATUS_META } from '@/lib/constants';
import { cn, fmtDateTime } from '@/lib/utils';
import type { ResponseStatus } from '@/lib/types';

type LookupResult = NonNullable<FunctionReturnType<typeof api.responses.lookupByRef>>;

/** REF codes are sixteen hex characters from the confirmation screen. */
function normalizeRef(raw: string): string {
  return raw.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 16);
}

export default function StatusPage() {
  const convex = useConvex();
  const [ref, setRef] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [lookedUpRef, setLookedUpRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deep link from the success screen: /status?ref=A1B2C3D4E5F60708
  useEffect(() => {
    const fromUrl = normalizeRef(new URLSearchParams(window.location.search).get('ref') ?? '');
    if (fromUrl.length === 16) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot URL hydration; track() flips loading state before its first await.
      setRef(fromUrl);
      void track(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track reads convex/state refs that are stable for the page's life.
  }, []);

  async function track(code: string) {
    const clean = normalizeRef(code);
    if (clean.length !== 16) {
      setError('A REF code is sixteen letters and numbers, like the one on your confirmation screen.');
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    setResult(null);
    try {
      const found = await convex.query(api.responses.lookupByRef, { ref: clean.toLowerCase() });
      setLookedUpRef(clean);
      if (found) {
        setResult(found);
      } else {
        setNotFound(true);
      }
    } catch (e) {
      setError(errorMessage(e, 'That lookup didn’t go through. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  const status = result?.responseStatus as ResponseStatus | undefined;
  const statusMeta = status ? RESPONSE_STATUS_META[status] : null;

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ballpoint-700">
            Track your response
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Where did it go?
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
            Every submission gets a REF code. Enter it to see where your
            response sits in the organizer’s queue — no sign-in, and never
            your answers.
          </p>
        </div>

        <form
          className="mx-auto mt-7 flex max-w-md flex-col items-stretch gap-2 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            void track(ref);
          }}
        >
          <div className="relative flex-1">
            <input
              value={ref}
              onChange={(e) => setRef(normalizeRef(e.target.value))}
              placeholder="16-character REF"
              aria-label="Your REF code"
              maxLength={16}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="h-12 w-full rounded-lg border border-input bg-card text-center font-mono text-sm font-semibold uppercase tracking-[0.18em] text-ink outline-none transition placeholder:tracking-normal placeholder:text-ink/30 focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>
          <Button size="lg" type="submit" className="w-full sm:w-auto" disabled={loading || ref.length !== 16}>
            <Search />
            {loading ? 'Looking…' : 'Track'}
          </Button>
        </form>

        {error ? (
          <p className="mx-auto mt-4 max-w-md text-center text-sm font-medium text-correction" role="alert">
            {error}
          </p>
        ) : null}

        {notFound ? (
          <div className="mx-auto mt-8 max-w-xl slip px-5 py-10 text-center sm:px-6 sm:py-12">
            <span className="mx-auto grid size-14 place-items-center rounded-lg bg-ink/[0.05]">
              <FileQuestion className="size-7 text-ink/60" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">
              Nothing with that code
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/60">
              {lookedUpRef
                ? `No response matches REF #${lookedUpRef}. Double-check the code from your confirmation screen.`
                : 'Check the code on your confirmation screen and try again.'}
            </p>
          </div>
        ) : null}

        {result && statusMeta ? (
          <div className="animate-pop mx-auto mt-8 max-w-xl slip">
            <div className="flex items-center gap-2 border-b border-ink/10 px-5 py-4 sm:px-8">
              <CategoryBadge category={result.formCategory} />
              <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-ink/60">
                REF #{lookedUpRef}
              </span>
            </div>
            <div className="p-5 sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink/60">
                {result.formTitle}
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
                <span className="font-mono text-[11px] text-ink/60">
                  Submitted {fmtDateTime(result.submittedAt)}
                </span>
              </div>

              {result.publicNote ? (
                <div className="mt-5 rounded-lg border border-ballpoint-200 bg-ballpoint-50 px-4 py-3">
                  <p className="text-sm font-medium text-ballpoint-700">From the organizer</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ballpoint-900">
                    {result.publicNote}
                  </p>
                </div>
              ) : null}

              <ol
                className="mt-6 flex items-center"
                aria-label={`Queue position: ${statusMeta.label}`}
              >
                {(['new', 'in-progress', 'done'] as const).map((s, i, arr) => {
                  const order = { new: 0, 'in-progress': 1, done: 2 } as const;
                  const current = order[status as ResponseStatus];
                  const done = i < current;
                  const active = i === current;
                  const meta = RESPONSE_STATUS_META[s];
                  return (
                    <li key={s} className={cn('flex items-center', i < arr.length - 1 && 'flex-1')}>
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          aria-hidden
                          className={cn(
                            'grid size-7 place-items-center rounded-full border text-[12px] font-bold transition',
                            done && 'border-tick-solid bg-tick-solid text-on-tick',
                            active && 'border-accent-solid bg-accent-solid text-on-accent shadow-sm',
                            !done && !active && 'border-ink/15 bg-ink/[0.04] text-ink/60'
                          )}
                        >
                          {done ? '✓' : i + 1}
                        </span>
                        <span
                          className={cn(
                            'whitespace-nowrap text-[11px] font-medium',
                            active ? 'text-ink' : 'text-ink/60'
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      {i < arr.length - 1 ? (
                        <span
                          aria-hidden
                          className={cn(
                            'mx-2 mb-5 h-0.5 flex-1 rounded-full',
                            i < current ? 'bg-tick-solid' : 'bg-ink/10'
                          )}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ol>

              <p className="mt-5 flex items-start gap-2.5 rounded-lg border border-ink/10 bg-paper px-4 py-3 text-sm leading-relaxed text-ink/70">
                <EyeOff className="mt-0.5 size-4 shrink-0 text-ink/60" aria-hidden />
                {result.isAnonymous
                  ? 'This was an anonymous response. The organizer sees the status above; the answers stay with them, not this page.'
                  : 'The organizer has your answers. This page only shows where they sit in the queue.'}
              </p>
            </div>
          </div>
        ) : null}

        <p className="mt-10 text-center text-sm text-ink/60">
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
