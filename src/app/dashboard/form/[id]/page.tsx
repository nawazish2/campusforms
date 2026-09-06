'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Eye,
  FileQuestion,
  FileSpreadsheet,
  Inbox,
  Lock,
  Pencil,
  Pin,
  Search,
  Trash2,
  TriangleAlert,
  Unlock,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { SetupRequired } from '@/components/setup-required';
import { CategoryBadge } from '@/components/category-badge';
import { StatusBadge } from '@/components/status-badge';
import { AnonymousBadge } from '@/components/anonymous-badge';
import { QuestionSummaryCard } from '@/components/question-summary';
import { CopyLinkButton } from '@/components/copy-link-button';
import { QrShare } from '@/components/qr-share';
import { ActivityChart } from '@/components/activity-chart';
import { Stars } from '@/components/stars';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { FilterChip } from '@/components/ui/filter-chip';
import { useToast } from '@/components/ui/toast';
import { RESPONSE_STATUS_META } from '@/lib/constants';
import { useFormResults, useRequireAuth } from '@/lib/db/hooks';
import {
  deleteForm,
  deleteResponse,
  setFormPinned,
  setFormStatus,
  setResponseStatus,
} from '@/lib/db/forms';
import { downloadResponsesCsv } from '@/lib/csv';
import { formStats } from '@/lib/analytics';
import {
  answerToText,
  avatarColor,
  cn,
  deadlineInfo,
  fmtDateTime,
  fmtDeadline,
  initials,
  pluralize,
  timeAgo,
} from '@/lib/utils';
import type {
  AnswerValue,
  FormDefinition,
  FormResponse,
  Question,
  ResponseStatus,
} from '@/lib/types';

export default function FormResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { db, data, error, configured, loading, signedOut, refresh } = useFormResults(params.id);
  useRequireAuth(signedOut);
  const form = data?.form ?? null;

  const [tab, setTab] = useState<'summary' | 'responses'>('summary');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResponseStatus | 'all'>('all');
  const [confirmDeleteResponse, setConfirmDeleteResponse] = useState<FormResponse | null>(null);
  const [busy, setBusy] = useState(false);

  // Already ordered newest-first by the query.
  const formResponses = useMemo(() => data?.responses ?? [], [data]);

  /** Runs a write, then refetches so the page can't show a stale row. */
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

  // Search covers the answers themselves, not just the name — an organizer
  // looking for "block C" is looking for what the student wrote.
  const visibleResponses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return formResponses.filter((r) => {
      if (statusFilter !== 'all' && (r.status ?? 'new') !== statusFilter) return false;
      if (!q) return true;
      if (r.respondentName?.toLowerCase().includes(q)) return true;
      if (r.respondentEmail?.toLowerCase().includes(q)) return true;
      return (form?.questions ?? []).some((question) =>
        answerToText(r.answers[question.id], question).toLowerCase().includes(q)
      );
    });
  }, [formResponses, query, statusFilter, form?.questions]);

  // Export follows what's on screen, so the button has to say when that's
  // fewer rows than the form holds.
  const filtered = query.trim() !== '' || statusFilter !== 'all';

  const statusCounts = useMemo(() => {
    const counts = { new: 0, 'in-progress': 0, done: 0 } as Record<ResponseStatus, number>;
    for (const r of formResponses) counts[r.status ?? 'new'] += 1;
    return counts;
  }, [formResponses]);

  if (!configured) return <SetupRequired />;

  if (loading) {
    return (
      <div className="min-h-svh">
        <DashboardHeader />
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6" aria-hidden>
          <div className="h-28 animate-pulse rounded-2xl border border-ink/[0.06] bg-card/70" />
          <div className="h-40 animate-pulse rounded-2xl border border-ink/[0.06] bg-card/70" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-svh">
        <DashboardHeader />
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50">
            <TriangleAlert className="size-7 text-amber-600" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
            Couldn’t load this form
          </h1>
          <p className="mt-2 text-sm text-ink/55">{error}</p>
          <Button variant="secondary" className="mt-6" onClick={refresh}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-svh">
        <DashboardHeader />
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-ink/[0.05]">
            <FileQuestion className="size-7 text-ink/40" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">Form not found</h1>
          <p className="mt-2 text-sm text-ink/55">It may have been deleted.</p>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: 'secondary', className: 'mt-6' })}
          >
            <ArrowLeft />
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const stats = formStats(formResponses);
  const dl = deadlineInfo(form.deadline);
  // Only reached after the fetch resolves, so `window` is safe to read here.
  const shareLink = `${window.location.origin}/f/${form.id}`;

  const toggleStatus = () => {
    if (form.status === 'open') {
      mutate(
        () => setFormStatus(db, form.id, 'closed'),
        'Form closed — it no longer accepts responses'
      );
    } else {
      mutate(
        () => setFormStatus(db, form.id, 'open'),
        form.status === 'draft' ? 'Form published — share the link' : 'Form reopened'
      );
    }
  };

  return (
    <div className="min-h-svh">
      <DashboardHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/50 transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Your forms
        </Link>

        {/* Header */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {form.pinned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-marker px-2.5 py-0.5 text-xs font-medium text-ink ring-1 ring-inset ring-marker-strong">
                  <Pin className="size-3" aria-hidden />
                  Pinned
                </span>
              ) : null}
              <CategoryBadge category={form.category} />
              <StatusBadge status={form.status} />
              {form.anonymous ? <AnonymousBadge /> : null}
            </div>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {form.title || 'Untitled form'}
            </h1>
            {form.description ? (
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink/55">
                {form.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                mutate(
                  () => setFormPinned(db, form.id, !form.pinned),
                  form.pinned ? 'Unpinned' : 'Pinned to the top of the notice board'
                )
              }
            >
              <Pin className={cn(form.pinned && 'text-ballpoint-700')} />
              {form.pinned ? 'Unpin' : 'Pin to top'}
            </Button>
            {form.status === 'open' ? (
              <Button variant="secondary" onClick={toggleStatus}>
                <Lock />
                Close form
              </Button>
            ) : (
              <Button variant="tick" onClick={toggleStatus}>
                {form.status === 'draft' ? <Eye /> : <Unlock />}
                {form.status === 'draft' ? 'Publish' : 'Reopen'}
              </Button>
            )}
            <Link
              href={`/dashboard/form/${form.id}/edit`}
              className={buttonVariants({ variant: 'secondary' })}
            >
              <Pencil />
              Edit
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                if (visibleResponses.length === 0) {
                  toast(
                    formResponses.length === 0
                      ? 'No responses to export yet'
                      : 'No responses match the current filter',
                    'error'
                  );
                  return;
                }
                downloadResponsesCsv(form, visibleResponses);
                toast(`Exported ${pluralize(visibleResponses.length, 'response')}`);
              }}
            >
              <FileSpreadsheet />
              Export CSV
              {filtered ? (
                <span className="font-mono text-[11px] text-ink/45">
                  {visibleResponses.length}
                </span>
              ) : null}
            </Button>
            <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              Delete
            </Button>
          </div>
        </div>

        {/* Banners */}
        {form.status === 'draft' ? (
          <Notice tone="ballpoint">
            <p>
              <strong className="font-semibold">This form is a draft.</strong>{' '}
              Publish it to start collecting responses from students.
            </p>
          </Notice>
        ) : null}
        {form.status === 'closed' || dl.expired ? (
          <Notice tone="amber">
            <p>
              <strong className="font-semibold">
                {form.status === 'closed' ? 'This form is closed.' : 'The deadline has passed.'}
              </strong>{' '}
              It isn’t accepting new responses. Reopen it to collect again.
            </p>
          </Notice>
        ) : null}

        {/* Share + stats */}
        <div className="mt-6 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-5 rounded-2xl border border-ink/[0.08] bg-card p-5 shadow-sm sm:flex-row">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/45">
                Share link
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Input readOnly value={shareLink} className="font-mono text-[13px]" aria-label="Share link" />
                <CopyLinkButton link={shareLink} label="Copy" />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink/50">
                Drop it in the hostel group, pin it to the notice board, or
                print the QR — students don’t need an account.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-2">
              <QrShare link={shareLink} />
              <Link
                href={`/dashboard/form/${form.id}/poster`}
                className="font-mono text-[11px] uppercase tracking-wider text-ink/45 transition hover:text-ballpoint-700"
              >
                Print poster
              </Link>
            </div>
          </div>
          <dl className="flex h-full flex-col justify-between rounded-2xl border border-ink/[0.08] bg-card px-5 py-1 shadow-sm">
            <StatRow label="Responses" value={stats.total} />
            <StatRow label="Today" value={stats.today} />
            <StatRow label="Last response" value={stats.last ? timeAgo(stats.last) : '—'} />
            <StatRow
              label="Deadline"
              value={form.deadline ? fmtDeadline(form.deadline) : 'None'}
            />
          </dl>
        </div>

        <div className="mt-3">
          <ActivityChart responses={formResponses} />
        </div>

        {/* Tabs */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="inline-flex rounded-full border border-ink/10 bg-card p-1 shadow-sm">
            {(
              [
                { key: 'summary', label: 'Summary', short: 'Summary' },
                {
                  key: 'responses',
                  label: `Individual responses${stats.total ? ` (${stats.total})` : ''}`,
                  short: `Responses${stats.total ? ` (${stats.total})` : ''}`,
                },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40',
                  tab === t.key ? 'bg-ink text-paper shadow-sm' : 'text-ink/55 hover:text-ink'
                )}
              >
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.short}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {stats.total === 0 ? (
          <div className="mt-5 grid place-items-center rounded-3xl border border-dashed border-ink/15 bg-card/60 px-6 py-20 text-center">
            <Inbox className="size-10 text-ink/20" aria-hidden />
            <h2 className="mt-4 font-display text-lg font-bold tracking-tight">
              No responses yet
            </h2>
            <p className="mt-1 max-w-sm text-sm text-ink/50">
              Share the link above — responses show up here the moment
              students submit.
            </p>
          </div>
        ) : tab === 'summary' ? (
          // Two columns: one card per row left the charts sitting in the
          // first third of the page with nothing beside them.
          <div className="mt-5 grid items-start gap-4 lg:grid-cols-2">
            {form.questions.map((q, i) => (
              <QuestionSummaryCard key={q.id} question={q} responses={formResponses} index={i} />
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput value={query} onChange={setQuery} label="Search responses" />
              <div className="flex flex-wrap gap-2">
                <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                  All {formResponses.length}
                </FilterChip>
                {RESPONSE_STATUSES.map((s) => (
                  <FilterChip
                    key={s.value}
                    active={statusFilter === s.value}
                    onClick={() => setStatusFilter(s.value)}
                  >
                    {s.label} {statusCounts[s.value]}
                  </FilterChip>
                ))}
              </div>
            </div>

            {visibleResponses.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-ink/15 px-6 py-14 text-center">
                <Search className="mx-auto size-6 text-ink/25" aria-hidden />
                <p className="mt-3 text-sm font-medium">No responses match</p>
                <p className="mt-1 text-sm text-ink/50">
                  Try a different search, or clear the status filter.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {visibleResponses.map((r) => (
                  <ResponseCard
                    key={r.id}
                    response={r}
                    form={form}
                    onStatusChange={(status) =>
                      mutate(() => setResponseStatus(db, r.id, status), 'Response updated')
                    }
                    onDelete={() => setConfirmDeleteResponse(r)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete “${form.title || 'Untitled form'}”?`}
        description={`This permanently removes the form and its ${pluralize(formResponses.length, 'response')}. This can’t be undone.`}
      >
        <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={async () => {
            setConfirmDelete(false);
            try {
              await deleteForm(db, form.id);
              toast('Form deleted');
              router.push('/dashboard');
            } catch (e) {
              toast(e instanceof Error ? e.message : 'Couldn’t delete this form', 'error');
            }
          }}
        >
          <Trash2 />
          Delete form
        </Button>
      </Dialog>

      <Dialog
        open={confirmDeleteResponse !== null}
        onClose={() => setConfirmDeleteResponse(null)}
        title="Delete this response?"
        description={`Removes the response from ${
          confirmDeleteResponse?.respondentName ?? 'an anonymous student'
        }. This can’t be undone.`}
      >
        <Button variant="secondary" onClick={() => setConfirmDeleteResponse(null)}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            const target = confirmDeleteResponse;
            setConfirmDeleteResponse(null);
            if (target) mutate(() => deleteResponse(db, target.id), 'Response deleted');
          }}
        >
          <Trash2 />
          Delete response
        </Button>
      </Dialog>
    </div>
  );
}

/**
 * The four numbers live in the narrow column beside the share panel, where
 * three separate cards left no room for their own labels. One row each, label
 * and value on the same line, so the column width goes to the text.
 */
function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink/[0.06] py-3 last:border-0">
      <dt className="font-mono text-[11px] uppercase tracking-wider text-ink/45">
        {label}
      </dt>
      <dd className="text-right font-display text-[15px] font-bold tracking-tight tabular-nums">
        {value}
      </dd>
    </div>
  );
}

const RESPONSE_STATUSES: { value: ResponseStatus; label: string }[] = (
  Object.entries(RESPONSE_STATUS_META) as [ResponseStatus, { label: string; chip: string }][]
).map(([value, m]) => ({ value, label: m.label }));

function Notice({ tone, children }: { tone: 'ballpoint' | 'amber'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed',
        tone === 'ballpoint'
          ? 'border-ballpoint-200 bg-ballpoint-50 text-ballpoint-900'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      )}
    >
      {children}
    </div>
  );
}

function ResponseCard({
  response,
  form,
  onStatusChange,
  onDelete,
}: {
  response: FormResponse;
  form: FormDefinition;
  onStatusChange: (status: ResponseStatus) => void;
  onDelete: () => void;
}) {
  const status = response.status ?? 'new';
  return (
    <article className="rounded-2xl border border-ink/[0.08] bg-card p-5 shadow-sm sm:p-6">
      <header className="flex items-center gap-3">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold',
            avatarColor(response.respondentName)
          )}
          aria-hidden
        >
          {initials(response.respondentName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {response.respondentName ?? 'Anonymous student'}
          </p>
          <p className="font-mono text-[11px] text-ink/40">{fmtDateTime(response.submittedAt)}</p>
        </div>
        <span className="ml-auto hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink/30 sm:inline">
          #{response.id.slice(-6).toUpperCase()}
        </span>
      </header>

      <div className="mt-3 flex items-center gap-2">
        <Select
          aria-label="Response status"
          className={cn('h-8 w-36 text-[13px]', STATUS_TINT[status])}
          value={status}
          onChange={(e) => onStatusChange(e.target.value as ResponseStatus)}
        >
          {RESPONSE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-ink/45 hover:bg-red-50 hover:text-red-600"
          onClick={onDelete}
        >
          <Trash2 />
          <span className="sr-only sm:not-sr-only">Delete</span>
        </Button>
      </div>

      <dl className="mt-4 divide-y divide-ink/[0.06] border-t border-ink/[0.06]">
        {form.questions.map((q) => (
          <div key={q.id} className="grid gap-1 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
            <dt className="text-[13px] leading-snug text-ink/45">{q.title}</dt>
            <dd className="min-w-0 text-sm">
              <Answer answer={response.answers[q.id]} question={q} />
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

const STATUS_TINT: Record<ResponseStatus, string> = {
  new: RESPONSE_STATUS_META.new.chip,
  'in-progress': RESPONSE_STATUS_META['in-progress'].chip,
  done: RESPONSE_STATUS_META.done.chip,
};

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
  return <span className="whitespace-pre-wrap font-medium text-ink/85">{String(answer)}</span>;
}
