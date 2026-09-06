'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarClock,
  Copy,
  Inbox,
  LayoutGrid,
  Link2,
  Pencil,
  Pin,
  Plus,
  Trash2,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { SetupRequired } from '@/components/setup-required';
import { CategoryBadge } from '@/components/category-badge';
import { StatusBadge } from '@/components/status-badge';
import { AnonymousBadge } from '@/components/anonymous-badge';
import { StatCard } from '@/components/stat-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { SearchInput } from '@/components/ui/search-input';
import { useToast } from '@/components/ui/toast';
import { useDashboard, useRequireAuth } from '@/lib/db/hooks';
import { deleteForm, duplicateForm, setFormPinned, setFormStatus } from '@/lib/db/forms';
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

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const { db, user, data, error, configured, loading, signedOut, refresh } = useDashboard();
  useRequireAuth(signedOut);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FormStatus>('all');
  const [deleting, setDeleting] = useState<FormSummary | null>(null);
  const [busy, setBusy] = useState(false);

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

  const stats = {
    forms: forms.length,
    open: forms.filter((f) => isFormAccepting(f)).length,
    responses: totalResponses,
    today: data?.todayCount ?? 0,
  };

  const copyLink = async (formId: string) => {
    const link = `${window.location.origin}/f/${formId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast('Link copied to clipboard');
    } catch {
      toast('Couldn’t copy — check your browser permissions', 'error');
    }
  };

  const statusAction = (f: FormSummary) => {
    if (f.status === 'draft') {
      return (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => {
            if (f.questions.length === 0) {
              toast('Add at least one question before publishing', 'error');
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

  if (!configured) return <SetupRequired />;

  return (
    <div className="min-h-svh">
      <DashboardHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your forms
            </h1>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/45">
              {pluralize(forms.length, 'form')} · {pluralize(totalResponses, 'response')} collected
            </p>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
            <div className="text-[13px] leading-relaxed text-amber-900">
              <p className="font-semibold">Couldn’t load your forms</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <Button size="sm" variant="secondary" className="ml-auto" onClick={refresh}>
              Retry
            </Button>
          </div>
        ) : null}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Forms" value={stats.forms.toLocaleString('en-US')} icon={LayoutGrid} />
          <StatCard
            label="Open now"
            value={stats.open.toLocaleString('en-US')}
            sub="accepting responses"
            icon={TrendingUp}
          />
          <StatCard
            label="Responses"
            value={stats.responses.toLocaleString('en-US')}
            icon={Inbox}
          />
          <StatCard
            label="Today"
            value={stats.today.toLocaleString('en-US')}
            sub="responses so far"
            icon={CalendarClock}
          />
        </div>

        {/* Toolbar + list + activity */}
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_290px]">
          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput value={query} onChange={setQuery} label="Search your forms…" />
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
                    : 'border-ink/10 bg-card text-ink/60 hover:border-ink/25 hover:text-ink'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Form list */}
        {!loading ? (
          filtered.length > 0 ? (
            <div className="mt-5 divide-y divide-ink/[0.06] rounded-2xl border border-ink/[0.08] bg-card shadow-sm">
              {filtered.map((f, i) => {
                const dl = deadlineInfo(f.deadline);
                return (
                  <div
                    key={f.id}
                    className="animate-fade-up flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 transition hover:bg-ink/[0.015] sm:px-5"
                    style={{ animationDelay: `${Math.min(i * 45, 270)}ms` }}
                  >
                    <div className="min-w-0 flex-1 basis-56">
                      <Link
                        href={`/dashboard/form/${f.id}`}
                        className="block truncate font-display text-[15px] font-bold tracking-tight transition hover:text-ballpoint-700"
                      >
                        {f.title || 'Untitled form'}
                      </Link>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {f.pinned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-marker px-2.5 py-0.5 text-xs font-medium text-ink ring-1 ring-inset ring-marker-strong">
                            <Pin className="size-3" aria-hidden />
                            Pinned
                          </span>
                        ) : null}
                        <CategoryBadge category={f.category} />
                        <StatusBadge status={f.status} />
                        {f.anonymous ? <AnonymousBadge /> : null}
                        {f.status === 'open' && dl.label ? (
                          <span className="font-mono text-[11px] text-ink/45">{dl.label}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-4">
                    <div className="flex items-baseline gap-1.5 sm:block sm:w-20 sm:text-right">
                      <p className="font-display text-lg font-bold leading-none">
                        {f.responseCount}
                      </p>
                      <p className="text-[11px] text-ink/40 sm:mt-0.5">responses</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {statusAction(f)}
                      <div className="ml-1 flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={busy}
                          onClick={() =>
                            mutate(
                              () => setFormPinned(db, f.id, !f.pinned),
                              f.pinned ? 'Unpinned' : 'Pinned to the top of the notice board'
                            )
                          }
                          aria-label={f.pinned ? 'Unpin from notice board' : 'Pin to notice board'}
                          title={f.pinned ? 'Unpin' : 'Pin to notice board'}
                          className={cn(f.pinned && 'text-ballpoint-700')}
                        >
                          <Pin />
                        </Button>
                        <Link
                          href={`/dashboard/form/${f.id}`}
                          aria-label="View results"
                          title="Results"
                          className={buttonVariants({
                            variant: 'ghost',
                            size: 'icon-sm',
                            className: 'hidden sm:inline-flex',
                          })}
                        >
                          <BarChart3 />
                        </Link>
                        <Link
                          href={`/dashboard/form/${f.id}/edit`}
                          aria-label="Edit form"
                          title="Edit"
                          className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                        >
                          <Pencil />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => copyLink(f.id)}
                          aria-label="Copy share link"
                          title="Copy link"
                          className="hidden sm:inline-flex"
                        >
                          <Link2 />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            if (!user) return;
                            mutate(
                              () => duplicateForm(db, user.id, f.id),
                              'Duplicated as a draft'
                            );
                          }}
                          aria-label="Duplicate form"
                          title="Duplicate"
                          className="hidden sm:inline-flex"
                        >
                          <Copy />
                        </Button>
                        <Button
                          variant="danger-ghost"
                          size="icon-sm"
                          onClick={() => setDeleting(f)}
                          aria-label="Delete form"
                          title="Delete"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 grid place-items-center rounded-3xl border border-dashed border-ink/15 bg-card/60 px-6 py-16 text-center">
              <Inbox className="size-10 text-ink/20" aria-hidden />
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
          <div className="mt-5 space-y-2" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-ink/[0.06] bg-card/70" />
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
    <section className="rounded-2xl border border-ink/[0.08] bg-card p-5 shadow-sm">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/45">
        Recent activity
      </p>
      {recent.length === 0 ? (
        <p className="mt-4 text-[13px] leading-relaxed text-ink/45">
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
                  className="block truncate text-xs text-ink/45 transition hover:text-ballpoint-700"
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
