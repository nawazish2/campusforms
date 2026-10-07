'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, Inbox, Pin, Timer, Users, WifiOff } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CategoryBadge } from '@/components/category-badge';
import { AnonymousBadge } from '@/components/anonymous-badge';
import { MorphSearchCapsule } from '@/components/ui/morph-search-capsule';
import { CanvasShimmerSkeleton } from '@/components/ui/canvas-shimmer-skeleton';
import { NoticeSlip } from '@/components/ui/notice-slip';
import { FilterChip } from '@/components/ui/filter-chip';
import { useOpenForms } from '@/lib/db/hooks';
import { CATEGORIES, CATEGORY_LIST } from '@/lib/constants';
import { demoForm, isDemoFormId } from '@/lib/demo';
import {
  cn,
  deadlineInfo,
  estimateFillMinutes,
  isFormAccepting,
  pluralize,
  spotsLeft,
} from '@/lib/utils';
import type { FormCategory } from '@/lib/types';
import type { FormSummary } from '@/lib/db/schema';

function parseCategory(raw: string | null): FormCategory | 'all' {
  if (raw && raw in CATEGORIES) return raw as FormCategory;
  return 'all';
}

function matchesQuery(form: FormSummary, q: string): boolean {
  if (!q) return true;
  return `${form.title} ${form.description}`.toLowerCase().includes(q);
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<BrowseSkeleton />}>
      <BrowseBoard />
    </Suspense>
  );
}

function BrowseSkeleton() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-14" aria-hidden>
        <div className="skeleton h-10 w-64 rounded" />
        <div className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CanvasShimmerSkeleton key={i} className="h-48" />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function BrowseBoard() {
  const { forms, error, loading } = useOpenForms();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const category = parseCategory(params.get('category'));

  const setCategory = (next: FormCategory | 'all') => {
    const usp = new URLSearchParams(params.toString());
    if (next === 'all') usp.delete('category');
    else usp.set('category', next);
    const qs = usp.toString();
    router.replace(qs ? `/browse?${qs}` : '/browse', { scroll: false });
  };

  // The query already filters to open forms; a passed deadline or a full cap
  // closes a form without changing its status, so that check stays here.
  const openForms = useMemo(() => forms.filter((f) => isFormAccepting(f)), [forms]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return openForms
      .filter((f) => category === 'all' || f.category === category)
      .filter((f) => matchesQuery(f, q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
  }, [openForms, category, query]);

  const sample = useMemo(() => demoForm(), []);
  const showSample = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (category === 'all' || category === sample.category) && matchesQuery(sample, q);
  }, [category, query, sample]);

  const cards = useMemo(() => {
    if (!showSample) return visible;
    return visible.length === 0 ? [sample, ...visible] : [...visible, sample];
  }, [showSample, visible, sample]);

  const responsesOnOpen = useMemo(
    () => openForms.reduce((sum, f) => sum + f.responseCount, 0),
    [openForms]
  );

  const hasFilters = query.trim() !== '' || category !== 'all';

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-14">
        <div className="animate-fade-up max-w-2xl">
          <h1 className="font-display text-5xl font-semibold sm:text-6xl">
            Open forms
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink/70">
            Fill a complaint, register for an event, or drop anonymous
            feedback. No sign-in needed.
          </p>
          {!loading && openForms.length > 0 ? (
            <p className="mt-4 font-mono text-xs uppercase tracking-wider text-ink/60">
              {pluralize(openForms.length, 'open form')},{' '}
              {pluralize(responsesOnOpen, 'response')} collected
            </p>
          ) : null}
        </div>

        <div className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:items-center [animation-delay:80ms]">
          <MorphSearchCapsule value={query} onSearch={setQuery} placeholder="Search forms…" />
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={category === 'all'} onClick={() => setCategory('all')}>
              All
            </FilterChip>
            {CATEGORY_LIST.map((c) => (
              <FilterChip
                key={c.key}
                active={category === c.key}
                onClick={() => setCategory(category === c.key ? 'all' : c.key)}
                icon={c.icon}
              >
                {c.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {error ? (
          <NoticeSlip fastener="pin" className="animate-fade-up mx-auto mt-12 grid max-w-lg place-items-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-pin-soft text-correction">
              <WifiOff className="size-6" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold">
              Couldn’t load the notice board
            </h2>
            <p className="mt-2 max-w-sm text-sm text-ink/70">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-full border-[1.5px] border-ink/20 bg-card px-4 py-2 text-[13px] font-medium text-ink transition hover:border-ink/50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Try again
            </button>
          </NoticeSlip>
        ) : !loading ? (
          cards.length > 0 ? (
            <div className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((f, i) => (
                <FormCard key={f.id} form={f} index={i} delay={Math.min(i * 60, 360)} />
              ))}
            </div>
          ) : (
            <NoticeSlip fastener="tape" className="animate-fade-up mx-auto mt-12 grid max-w-lg place-items-center px-6 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-marker text-[#1d1a16]">
                <Inbox className="size-6" aria-hidden />
              </span>
              <h2 className="mt-4 font-display text-2xl font-semibold">
                Nothing on the board right now
              </h2>
              <p className="mt-1 max-w-sm text-sm text-ink/70">
                {hasFilters
                  ? 'No open forms match your search. Try another category or keyword.'
                  : 'When the hostel office or a club publishes a form, it shows up here.'}
              </p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setCategory('all');
                  }}
                  className="mt-5 rounded-full border-[1.5px] border-ink/20 bg-card px-4 py-2 text-[13px] font-medium text-ink transition hover:border-ink/50 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Clear filters
                </button>
              ) : null}
            </NoticeSlip>
          )
        ) : (
          <div className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <CanvasShimmerSkeleton key={i} className="h-48" label="Loading open forms" />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

const TILTS = [-1.2, 0.8, -0.6, 1.1];

function FormCard({ form: f, delay, index }: { form: FormSummary; delay: number; index: number }) {
  const dl = deadlineInfo(f.deadline);
  const spots = spotsLeft(f);
  const sample = isDemoFormId(f.id);
  return (
    <NoticeSlip
      tilt={TILTS[index % TILTS.length]}
      fastener={index % 2 === 0 ? 'tape' : 'pin'}
      className={cn('animate-fade-up group', f.pinned && 'bg-marker/20')}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Link
        href={`/f/${f.id}`}
        className="flex h-full flex-col rounded-[6px] p-5 pt-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex flex-wrap items-center gap-2">
          {sample ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-marker px-2.5 py-0.5 text-xs font-medium text-[#1d1a16]">
              Sample
            </span>
          ) : f.pinned ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-marker px-2.5 py-0.5 text-xs font-medium text-[#1d1a16]"
              title="Pinned by the organizer"
            >
              <Pin className="size-3" aria-hidden />
              Pinned
            </span>
          ) : null}
          <CategoryBadge category={f.category} />
          {f.anonymous ? <AnonymousBadge /> : null}
          <span className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-ink/60">
            <Timer className="size-3" aria-hidden />
            ~{estimateFillMinutes(f.questions)} min
          </span>
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold leading-snug group-hover:text-ballpoint-700">
          {f.title}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink/65">
          {sample ? 'Try it — this one doesn’t go to a hostel office.' : f.description}
        </p>
        <div className="mt-4 flex-1" />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-ink/20 pt-3.5 font-mono text-[11px] uppercase tracking-wide text-ink/60">
          {sample ? (
            <span>No sign-in · answers stay on this device</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" aria-hidden />
                {spots == null
                  ? pluralize(f.responseCount, 'response')
                  : `${spots} ${spots === 1 ? 'spot' : 'spots'} left`}
              </span>
              {dl.label ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1',
                    dl.label.startsWith('Closes today') ? 'font-bold text-correction' : null
                  )}
                >
                  <Clock className="size-3" aria-hidden />
                  {dl.label}
                </span>
              ) : null}
            </>
          )}
        </div>
      </Link>
    </NoticeSlip>
  );
}
