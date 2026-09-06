'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, Inbox, Pin, Timer, Users } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CategoryBadge } from '@/components/category-badge';
import { AnonymousBadge } from '@/components/anonymous-badge';
import { SearchInput } from '@/components/ui/search-input';
import { FilterChip } from '@/components/ui/filter-chip';
import { SetupRequired } from '@/components/setup-required';
import { useOpenForms } from '@/lib/db/hooks';
import { CATEGORY_LIST } from '@/lib/constants';
import {
  cn,
  deadlineInfo,
  estimateFillMinutes,
  isFormAccepting,
  pluralize,
} from '@/lib/utils';
import type { FormCategory } from '@/lib/types';

export default function BrowsePage() {
  const { forms, error, configured, loading } = useOpenForms();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FormCategory | 'all'>('all');

  // The query already filters to open forms; a passed deadline closes a form
  // without changing its status, so that check stays here.
  const openForms = useMemo(() => forms.filter((f) => isFormAccepting(f)), [forms]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return openForms
      .filter((f) => category === 'all' || f.category === category)
      .filter((f) => `${f.title} ${f.description}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
  }, [openForms, category, query]);

  const responsesOnOpen = useMemo(
    () => openForms.reduce((sum, f) => sum + f.responseCount, 0),
    [openForms]
  );

  const hasFilters = query.trim() !== '' || category !== 'all';

  if (!configured) return <SetupRequired variant="public" />;

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-14">
        <div className="animate-fade-up max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ballpoint-700">
            Student notice board
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Open forms
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink/60">
            Fill a complaint, register for an event, or drop anonymous
            feedback — no sign-in needed.
          </p>
          {!loading && openForms.length > 0 ? (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40">
              {pluralize(openForms.length, 'open form')} ·{' '}
              {pluralize(responsesOnOpen, 'response')} collected
            </p>
          ) : null}
        </div>

        {/* Filters */}
        <div className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:items-center [animation-delay:80ms]">
          <SearchInput value={query} onChange={setQuery} label="Search forms…" />
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

        {/* Grid */}
        {error ? (
          <div className="animate-fade-up mt-8 grid place-items-center rounded-3xl border border-dashed border-red-200 bg-red-50/50 px-6 py-16 text-center">
            <h2 className="font-display text-lg font-bold tracking-tight">
              Couldn’t load the notice board
            </h2>
            <p className="mt-1 max-w-sm text-sm text-ink/55">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg border border-ink/10 bg-card px-4 py-2 text-[13px] font-medium text-ink/70 shadow-sm transition hover:border-ink/25 hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40"
            >
              Try again
            </button>
          </div>
        ) : !loading ? (
          visible.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((f, i) => {
                const dl = deadlineInfo(f.deadline);
                return (
                  <Link
                    key={f.id}
                    href={`/f/${f.id}`}
                    className="group animate-fade-up relative flex flex-col overflow-hidden rounded-2xl border border-ink/[0.08] bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-ballpoint-300 hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40"
                    style={{ animationDelay: `${Math.min(i * 60, 360)}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      {f.pinned ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-marker px-2.5 py-0.5 text-xs font-medium text-ink"
                          title="Pinned by the organizer"
                        >
                          <Pin className="size-3" aria-hidden />
                          Pinned
                        </span>
                      ) : null}
                      <CategoryBadge category={f.category} />
                      {f.anonymous ? <AnonymousBadge /> : null}
                      <span className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-ink/40">
                        <Timer className="size-3" aria-hidden />
                        ~{estimateFillMinutes(f.questions)} min
                      </span>
                    </div>
                    <h2 className="mt-3.5 font-display text-[17px] font-bold leading-snug tracking-tight group-hover:text-ballpoint-800">
                      {f.title}
                    </h2>
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink/50">
                      {f.description}
                    </p>
                    <div className="mt-4 flex-1" />
                    <div className="flex items-center gap-3 border-t border-ink/[0.07] pt-3.5 font-mono text-[11px] text-ink/45">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" aria-hidden />
                        {pluralize(f.responseCount, 'response')}
                      </span>
                      {dl.label ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1',
                            dl.label.startsWith('Closes today')
                              ? 'font-semibold text-amber-600'
                              : null
                          )}
                        >
                          <Clock className="size-3" aria-hidden />
                          {dl.label}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="animate-fade-up mt-8 grid place-items-center rounded-3xl border border-dashed border-ink/15 bg-card/60 px-6 py-20 text-center">
              <Inbox className="size-10 text-ink/20" aria-hidden />
              <h2 className="mt-4 font-display text-lg font-bold tracking-tight">
                Nothing on the board right now
              </h2>
              <p className="mt-1 max-w-sm text-sm text-ink/50">
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
                  className="mt-5 rounded-lg border border-ink/10 bg-card px-4 py-2 text-[13px] font-medium text-ink/70 shadow-sm transition hover:border-ink/25 hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          )
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-ink/[0.06] bg-card/70" />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
