'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarClock,
  Clock,
  Copy,
  Inbox,
  LayoutGrid,
  Link2,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Trash2,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { CommandPalette } from '@/components/command-palette';
import { SetupRequired } from '@/components/setup-required';
import { CategoryBadge } from '@/components/category-badge';
import { StatusBadge } from '@/components/status-badge';
import { AnonymousBadge } from '@/components/anonymous-badge';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SearchInput } from '@/components/ui/search-input';
import { useToast } from '@/components/ui/toast';
import { useDashboard, useRequireAuth } from '@/lib/db/hooks';
import { CATEGORY_ACCENT } from '@/lib/constants';
import { deleteForm, duplicateForm, setFormPinned, setFormStatus } from '@/lib/db/forms';
import { publishBlockers } from '@/lib/validation';
import type { FormSummary } from '@/lib/db/schema';
import {
  avatarColor,
  cn,
  deadlineInfo,
  initials,
  isFormAccepting,
  pluralize,
  timeAgo,
} from '@/lib/utils';
import type { FormResponse, FormStatus } from '@/lib/types';

const CLOSING_SOON_MS = 48 * 3600_000;

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const { db, user, data, error, configured, loading, signedOut, refresh } = useDashboard();
  useRequireAuth(signedOut);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FormStatus>('all');
  const [deleting, setDeleting] = useState<FormSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // "Now" for the closing-soon check, captured once per mount.
  const [now] = useState(() => Date.now());

  // "/" jumps to search from anywhere except inside a field or the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const forms = useMemo(() => data?.forms ?? [], [data]);
  const recent = data?.recent ?? [];

  /** Runs a write, then refetches. A failure surfaces instead of a stale row. */
  const mutate = async (run: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await run();
      refresh();
      toast(done);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That didn’t save', 'error');
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return forms
      .filter((f) => statusFilter === 'all' || f.status === statusFilter)
      .filter((f) => f.title.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [forms, statusFilter, query]);

  const totalResponses = useMemo(
    () => forms.reduce((sum, f) => sum + f.responseCount, 0),
    [forms]
  );

  const todayCount = data?.todayCount ?? 0;

  // The desk triage: drafts waiting to ship, and open forms about to close.
  const drafts = useMemo(() => forms.filter((f) => f.status === 'draft'), [forms]);
  const closingSoon = useMemo(
    () =>
      forms.filter((f) => {
        if (f.status !== 'open' || !f.deadline) return false;
        const ms = new Date(f.deadline).getTime() - now;
        return ms > 0 && ms < CLOSING_SOON_MS;
      }),
    [forms, now]
  );
  const attentionCount = drafts.length + closingSoon.length;

  const copyLink = async (formId: string) => {
    const link = `${window.location.origin}/f/${formId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast('Link copied to clipboard');
    } catch {
      toast('Couldn’t copy — check your browser permissions', 'error');
    }
  };

  const duplicate = (f: FormSummary) => {
    if (!user) return;
    setMenuFor(null);
    mutate(() => duplicateForm(db, user.id, f.id), 'Duplicated as a draft');
  };

  const togglePin = (f: FormSummary) => {
    setMenuFor(null);
    mutate(
      () => setFormPinned(db, f.id, !f.pinned),
      f.pinned ? 'Unpinned' : 'Pinned to the top of the notice board'
    );
  };

  const statusAction = (f: FormSummary) => {
    if (f.status === 'draft') {
      return (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => {
            const problems = publishBlockers(f);
            if (problems.length > 0) {
              toast(problems[0], 'error');
              return;
            }
            mutate(() => setFormStatus(db, f.id, 'open'), 'Form published — share the link');
          }}
        >
          Publish
        </Button>
      );
    }
    if (f.status === 'open') {
      return (
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() =>
            mutate(
              () => setFormStatus(db, f.id, 'closed'),
              'Form closed — it no longer accepts responses'
            )
          }
        >
          Close
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => mutate(() => setFormStatus(db, f.id, 'open'), 'Form reopened')}
      >
        Reopen
      </Button>
    );
  };

  const menuItems = (f: FormSummary) => (
    <>
      <Link
        href={`/dashboard/form/${f.id}`}
        onClick={() => setMenuFor(null)}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-ink/75 transition hover:bg-ink/[0.05] hover:text-ink"
      >
        <BarChart3 className="size-4 text-ink/40" aria-hidden />
        Results
      </Link>
      <Link
        href={`/dashboard/form/${f.id}/edit`}
        onClick={() => setMenuFor(null)}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-ink/75 transition hover:bg-ink/[0.05] hover:text-ink"
      >
        <Pencil className="size-4 text-ink/40" aria-hidden />
        Edit
      </Link>
      <button
        type="button"
        onClick={() => {
          setMenuFor(null);
          copyLink(f.id);
        }}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink/75 transition hover:bg-ink/[0.05] hover:text-ink"
      >
        <Link2 className="size-4 text-ink/40" aria-hidden />
        Copy link
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => duplicate(f)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink/75 transition hover:bg-ink/[0.05] hover:text-ink disabled:opacity-50"
      >
        <Copy className="size-4 text-ink/40" aria-hidden />
        Duplicate
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => togglePin(f)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink/75 transition hover:bg-ink/[0.05] hover:text-ink disabled:opacity-50"
      >
        <Pin className="size-4 text-ink/40" aria-hidden />
        {f.pinned ? 'Unpin' : 'Pin to board'}
      </button>
      <div className="mx-3 my-1.5 border-t border-ink/[0.07]" aria-hidden />
      <button
        type="button"
        onClick={() => {
          setMenuFor(null);
          setDeleting(f);
        }}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-correction transition hover:bg-correction-soft"
      >
        <Trash2 className="size-4" aria-hidden />
        Delete
      </button>
    </>
  );

  if (!configured) return <SetupRequired />;

  return (
    <div className="min-h-svh">
      <DashboardHeader />
      <CommandPalette forms={forms} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your forms
            </h1>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/50">
              {pluralize(forms.length, 'form')} · {pluralize(totalResponses, 'response')} collected
            </p>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-warn-bd bg-warn-bg px-4 py-3"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn-tx" aria-hidden />
            <div className="text-[13px] leading-relaxed text-warn-tx">
              <p className="font-semibold">Couldn’t load your forms</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <Button size="sm" variant="secondary" className="ml-auto" onClick={refresh}>
              Retry
            </Button>
          </div>
        ) : null}

        {/* Needs your attention — drafts to ship, deadlines approaching. */}
        {!loading && attentionCount > 0 ? (
          <section
            aria-label="Needs your attention"
            className="animate-fade-up mt-6 rounded-2xl border border-ink/10 bg-card p-4 shadow-sm sm:p-5"
          >
            <p className="text-sm font-semibold tracking-tight">
              Needs your attention
              <span className="ml-2 rounded-full bg-warn-bg px-2 py-0.5 font-mono text-[11px] font-medium text-warn-tx">
                {attentionCount}
              </span>
            </p>
            <ul className="mt-3 space-y-2">
              {drafts.slice(0, 3).map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-ink/[0.03] px-3.5 py-2.5 text-[13px]"
                >
                  <Pencil className="size-4 shrink-0 text-ink/40" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    “{f.title || 'Untitled form'}” is still a draft
                  </span>
                  <Link
                    href={`/dashboard/form/${f.id}/edit`}
                    className="font-semibold text-ballpoint-600 transition hover:text-ballpoint-700 dark:text-ballpoint-500 dark:hover:text-ballpoint-600"
                  >
                    Finish & publish →
                  </Link>
                </li>
              ))}
              {closingSoon.slice(0, 3).map((f) => {
                const dl = deadlineInfo(f.deadline);
                return (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-ink/[0.03] px-3.5 py-2.5 text-[13px]"
                  >
                    <Clock className="size-4 shrink-0 text-warn-tx" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      “{f.title || 'Untitled form'}” {dl.label?.toLowerCase() ?? 'closes soon'}
                    </span>
                    <Link
                      href={`/dashboard/form/${f.id}`}
                      className="font-semibold text-ballpoint-600 transition hover:text-ballpoint-700 dark:text-ballpoint-500 dark:hover:text-ballpoint-600"
                    >
                      Review responses →
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* Stats — responses lead, the rest compare. */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Responses"
            value={totalResponses}
            sub={todayCount > 0 ? `${pluralize(todayCount, 'response')} today` : 'across all forms'}
            icon={Inbox}
            accent
          />
          <StatCard
            label="Open now"
            value={forms.filter((f) => isFormAccepting(f)).length}
            sub="accepting responses"
            icon={TrendingUp}
          />
          <StatCard label="Forms" value={forms.length} icon={LayoutGrid} />
          <StatCard
            label="Today"
            value={todayCount}
            sub="responses so far"
            icon={CalendarClock}
          />
        </div>

        {/* Toolbar + list + activity */}
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_290px]">
          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput
                value={query}
                onChange={setQuery}
                label="Search your forms…"
                inputRef={searchRef}
                kbd="/"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 'open', 'draft', 'closed'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    aria-pressed={statusFilter === s}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-[13px] font-medium capitalize transition outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40',
                      statusFilter === s
                        ? 'border-ink bg-ink text-paper shadow-sm'
                        : 'border-ink/10 bg-card text-ink/60 hover:border-ink/20 hover:text-ink'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {query.trim() !== '' || statusFilter !== 'all' ? (
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/40">
                Showing {pluralize(filtered.length, 'form')}
              </p>
            ) : null}

            {/* Form list */}
            {!loading ? (
              filtered.length > 0 ? (
                <>
                  {/* Desktop: the table is the interface. */}
                  <div className="mt-4 hidden overflow-visible rounded-2xl border border-ink/10 bg-card shadow-sm md:block">
                    <table className="w-full border-separate border-spacing-0 text-left">
                      <thead>
                        <tr>
                          <th
                            scope="col"
                            className="border-b border-ink/[0.07] px-5 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45"
                          >
                            Form
                          </th>
                          <th
                            scope="col"
                            className="w-28 border-b border-ink/[0.07] px-4 py-3 text-right font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45"
                          >
                            Responses
                          </th>
                          <th
                            scope="col"
                            className="w-36 border-b border-ink/[0.07] px-4 py-3 text-right font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45"
                          >
                            Closes
                          </th>
                          <th scope="col" className="w-40 border-b border-ink/[0.07] px-4 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((f, i) => {
                          const dl = deadlineInfo(f.deadline);
                          const dot = CATEGORY_ACCENT[f.category].stripe.replace(
                            'border-l-',
                            'bg-'
                          );
                          return (
                            <tr
                              key={f.id}
                              className="animate-fade-up group border-t border-ink/[0.06] transition first:border-t-0 hover:bg-ink/[0.02] has-[.menu-open]:bg-ink/[0.02]"
                              style={{ animationDelay: `${Math.min(i * 35, 210)}ms` }}
                            >
                              <td className="max-w-0 px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={cn('size-2 shrink-0 rounded-full', dot)}
                                    aria-hidden
                                  />
                                  <Link
                                    href={`/dashboard/form/${f.id}`}
                                    className="truncate text-[14.5px] font-semibold tracking-tight transition hover:text-ballpoint-700 dark:hover:text-ballpoint-600"
                                  >
                                    {f.title || 'Untitled form'}
                                  </Link>
                                  {f.pinned ? (
                                    <Pin
                                      className="size-3.5 shrink-0 text-ballpoint-600"
                                      aria-label="Pinned"
                                    />
                                  ) : null}
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-[18px]">
                                  <CategoryBadge category={f.category} />
                                  <StatusBadge status={f.status} />
                                  {f.anonymous ? <AnonymousBadge /> : null}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 text-right font-display text-[17px] font-bold tabular-nums">
                                {f.responseCount}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono text-[11px] text-ink/50">
                                {dl.label ?? '—'}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5">
                                <div className="flex items-center justify-end gap-1.5">
                                  {statusAction(f)}
                                  <div className="relative">
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() =>
                                        setMenuFor((m) => (m === f.id ? null : f.id))
                                      }
                                      aria-label={`More actions for ${f.title || 'untitled form'}`}
                                      aria-expanded={menuFor === f.id}
                                      className={cn(
                                        menuFor === f.id &&
                                          'menu-open bg-ink/[0.05] text-ink'
                                      )}
                                    >
                                      <MoreHorizontal />
                                    </Button>
                                    {menuFor === f.id ? (
                                      <>
                                        <button
                                          aria-label="Close menu"
                                          className="fixed inset-0 z-10 cursor-default"
                                          onClick={() => setMenuFor(null)}
                                        />
                                        <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-ink/10 bg-card p-1.5 shadow-lg">
                                          {menuItems(f)}
                                        </div>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: condensed cards. */}
                  <div className="mt-4 space-y-2.5 md:hidden">
                    {filtered.map((f, i) => {
                      const dl = deadlineInfo(f.deadline);
                      return (
                        <article
                          key={f.id}
                          className="animate-fade-up rounded-2xl border border-ink/10 bg-card p-4 shadow-sm"
                          style={{ animationDelay: `${Math.min(i * 35, 210)}ms` }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              href={`/dashboard/form/${f.id}`}
                              className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight"
                            >
                              {f.title || 'Untitled form'}
                            </Link>
                            <span className="shrink-0 font-display text-lg font-bold tabular-nums">
                              {f.responseCount}
                              <span className="ml-1 align-middle font-sans text-[11px] font-normal text-ink/40">
                                {pluralize(f.responseCount, 'response').split(' ')[1]}
                              </span>
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <CategoryBadge category={f.category} />
                            <StatusBadge status={f.status} />
                            {f.anonymous ? <AnonymousBadge /> : null}
                            {dl.label ? (
                              <span className="font-mono text-[11px] text-ink/50">
                                {dl.label}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-ink/[0.06] pt-3">
                            {statusAction(f)}
                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setMenuFor((m) => (m === f.id ? null : f.id))}
                                aria-label={`More actions for ${f.title || 'untitled form'}`}
                                aria-expanded={menuFor === f.id}
                              >
                                <MoreHorizontal />
                              </Button>
                              {menuFor === f.id ? (
                                <>
                                  <button
                                    aria-label="Close menu"
                                    className="fixed inset-0 z-10 cursor-default"
                                    onClick={() => setMenuFor(null)}
                                  />
                                  <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-ink/10 bg-card p-1.5 shadow-lg">
                                    {menuItems(f)}
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="mt-4 grid place-items-center rounded-3xl border border-dashed border-ink/20 bg-card/60 px-6 py-16 text-center">
                  <Inbox className="size-10 text-ink/30" aria-hidden />
                  <h2 className="mt-4 font-display text-lg font-bold tracking-tight">
                    {forms.length === 0 ? 'No forms yet' : 'Nothing matches this filter'}
                  </h2>
                  <p className="mt-1 max-w-sm text-sm text-ink/50">
                    {forms.length === 0
                      ? 'Create your first form — a complaint form for the hostel, or a signup for your next event.'
                      : 'Try a different status or clear the search.'}
                  </p>
                  {forms.length === 0 ? (
                    <Button className="mt-5" onClick={() => router.push('/dashboard/new')}>
                      <Plus />
                      Create a form
                    </Button>
                  ) : null}
                </div>
              )
            ) : (
              <div className="mt-4 space-y-2" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-16 rounded-xl" />
                ))}
              </div>
            )}
          </div>

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
            <RecentActivity forms={forms} responses={recent} />
          </aside>
        </div>
      </main>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete “${deleting.title || 'Untitled form'}”?` : 'Delete form?'}
        description={
          deleting
            ? `This permanently removes the form and its ${pluralize(deleting.responseCount, 'response')}. This can’t be undone.`
            : undefined
        }
      >
        <Button variant="secondary" onClick={() => setDeleting(null)}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            const target = deleting;
            setDeleting(null);
            if (target) mutate(() => deleteForm(db, target.id), 'Form deleted');
          }}
        >
          <Trash2 />
          Delete form
        </Button>
      </Dialog>
    </div>
  );
}

function RecentActivity({
  forms,
  responses: recent,
}: {
  forms: FormSummary[];
  responses: FormResponse[];
}) {
  const formById = useMemo(() => new Map(forms.map((f) => [f.id, f])), [forms]);

  return (
    <section className="rounded-2xl border border-ink/10 bg-card p-5 shadow-sm">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/50">
        Recent activity
      </p>
      {recent.length === 0 ? (
        <p className="mt-4 text-[13px] leading-relaxed text-ink/50">
          Responses land here the moment students submit.
        </p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {recent.map((r) => (
            <li key={r.id} className="flex items-center gap-3">
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                  avatarColor(r.respondentName)
                )}
                aria-hidden
              >
                {initials(r.respondentName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">
                  {r.respondentName ?? 'Anonymous student'}
                </p>
                <Link
                  href={`/dashboard/form/${r.formId}`}
                  className="block truncate text-xs text-ink/50 transition hover:text-ballpoint-700 dark:hover:text-ballpoint-600"
                >
                  {formById.get(r.formId)?.title ?? 'Deleted form'}
                </Link>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-ink/40">
                {timeAgo(r.submittedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
