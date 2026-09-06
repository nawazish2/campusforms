'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  FileQuestion,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog } from '@/components/ui/dialog';
import { FormRenderer } from '@/components/form-renderer';
import { DashboardHeader } from '@/components/dashboard-header';
import { SetupRequired } from '@/components/setup-required';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/components/ui/toast';
import { useEditableForm, useRequireAuth } from '@/lib/db/hooks';
import { createForm, updateForm } from '@/lib/db/forms';
import {
  clearBuilderDraft,
  loadBuilderDraft,
  saveBuilderDraft,
  type BuilderDraft,
} from '@/lib/drafts';
import { validateDraft } from '@/lib/validation';
import { blankForm, newQuestion } from '@/lib/factories';
import { CATEGORIES, CATEGORY_LIST, QUESTION_TYPES, QUESTION_TYPE_MAP } from '@/lib/constants';
import { cn, timeAgo } from '@/lib/utils';
import type {
  AnswerValue,
  FormCategory,
  FormDefinition,
  Question,
  QuestionType,
} from '@/lib/types';

export function FormBuilder({
  mode,
  formId,
  initial,
}: {
  mode: 'create' | 'edit';
  formId?: string;
  /** Pre-filled draft for create mode (e.g. built from a template). */
  initial?: FormDefinition;
}) {
  const router = useRouter();
  const toast = useToast();
  const { db, user, form: existing, configured, loading, signedOut } = useEditableForm(
    mode === 'edit' ? formId : undefined
  );
  useRequireAuth(signedOut);
  const [saving, setSaving] = useState(false);

  // Kept for the whole life of the editor so "has anything changed?" has
  // something to compare against; in edit mode the stored form plays that role.
  const [pristine] = useState<FormDefinition | null>(
    mode === 'create' ? (initial ?? blankForm()) : null
  );
  const [draft, setDraft] = useState<FormDefinition | null>(pristine);

  // What the last successful save wrote. `existing` is fetched once and never
  // refetched, so without this the form would still read as unsaved right
  // after saving.
  const [baseline, setBaseline] = useState<FormDefinition | null>(null);

  const [leaveTo, setLeaveTo] = useState<string | null>(null);

  // Create-mode autosave: an unpublished form survives a closed tab. A stored
  // draft is offered as a banner rather than auto-applied, so a template the
  // organizer just picked always wins.
  const [savedBuilderDraft, setSavedBuilderDraft] = useState<BuilderDraft | null>(null);

  useEffect(() => {
    if (mode !== 'create') return;
    const stored = loadBuilderDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- readable only after rehydration.
    if (stored && !initial) setSavedBuilderDraft(stored);
  }, [mode, initial]);

  useEffect(() => {
    if (mode !== 'create' || !draft) return;
    const empty = !draft.title.trim() && draft.questions.length === 0;
    if (empty) return;
    const t = setTimeout(() => saveBuilderDraft(draft), 600);
    return () => clearTimeout(t);
  }, [draft, mode]);

  useEffect(() => {
    if (mode === 'edit' && !loading && existing && !draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the draft can only be seeded once localStorage has rehydrated.
      setDraft(structuredClone(existing));
    }
  }, [mode, loading, existing, draft]);

  const dirty =
    draft !== null &&
    JSON.stringify(draft) !==
      JSON.stringify(baseline ?? (mode === 'create' ? pristine : existing));

  useEffect(() => {
    if (!dirty) return;
    // Closing the tab or hitting reload is outside the router's reach, so the
    // browser's own confirmation is the only thing that can catch it.
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (!configured) return <SetupRequired />;

  if (loading) return <BuilderSkeleton />;

  if (mode === 'edit' && !draft) {
    if (!existing) {
      return (
        <div className="min-h-svh">
          <DashboardHeader />
          <NotFoundPanel />
        </div>
      );
    }
    return <BuilderSkeleton />;
  }

  const form = draft as FormDefinition;
  const patch = (p: Partial<FormDefinition>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));
  const patchQuestion = (qid: string, p: Partial<Question>) =>
    setDraft((d) =>
      d
        ? { ...d, questions: d.questions.map((q) => (q.id === qid ? { ...q, ...p } : q)) }
        : d
    );
  const addQuestion = (type: QuestionType) =>
    setDraft((d) => (d ? { ...d, questions: [...d.questions, newQuestion(type)] } : d));
  const removeQuestion = (qid: string) =>
    setDraft((d) => (d ? { ...d, questions: d.questions.filter((q) => q.id !== qid) } : d));
  const moveQuestion = (index: number, dir: -1 | 1) =>
    setDraft((d) => {
      if (!d) return d;
      const target = index + dir;
      if (target < 0 || target >= d.questions.length) return d;
      const questions = [...d.questions];
      [questions[index], questions[target]] = [questions[target], questions[index]];
      return { ...d, questions };
    });

  // save() bails when the draft or the session isn't ready. Without this the
  // buttons stayed enabled through that window and a click did nothing at
  // all — no toast, no error — which reads as a broken button.
  const busy = saving || !draft || !user;

  const save = async (status: 'draft' | 'open' | 'closed') => {
    if (!draft || !user || saving) return;
    // A draft is allowed to be half-finished; anything students can reach
    // has to hold together, so it's checked instead of quietly trimmed.
    if (status !== 'draft') {
      if (draft.questions.length === 0) {
        toast('Add at least one question before publishing', 'error');
        return;
      }
      const problems = validateDraft(draft);
      if (problems.length > 0) {
        toast(problems[0], 'error');
        return;
      }
    }
    const clean: FormDefinition = {
      ...draft,
      status,
      title: draft.title.trim() || 'Untitled form',
      questions: draft.questions.map((q) => ({
        ...q,
        title: q.title.trim(),
        options: q.options.map((o) => o.trim()),
      })),
    };
    setSaving(true);
    try {
      // Create returns the row the database made, so the redirect uses the
      // id Postgres assigned rather than one invented in the browser.
      const saved =
        mode === 'create'
          ? await createForm(db, user.id, clean)
          : await updateForm(db, clean.id, clean);
      setDraft(saved);
      setBaseline(saved);
      if (mode === 'create') clearBuilderDraft();
      toast(
        status === 'open'
          ? mode === 'create'
            ? 'Form published — share the link'
            : 'Changes saved'
          : 'Draft saved'
      );
      router.push(`/dashboard/form/${saved.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save this form', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-svh">
      <DashboardHeader />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Builder toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {dirty ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Back to dashboard"
                onClick={() => setLeaveTo('/dashboard')}
              >
                <ArrowLeft />
              </Button>
            ) : (
              <Link
                href="/dashboard"
                aria-label="Back to dashboard"
                className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
              >
                <ArrowLeft />
              </Link>
            )}
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/45">
              {mode === 'create' ? 'New form' : 'Edit form'}
            </span>
            {mode === 'edit' ? <StatusBadge status={form.status} /> : null}
            {dirty ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                <TriangleAlert className="size-3" aria-hidden />
                Unsaved
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {mode === 'create' || form.status === 'draft' ? (
              <>
                <Button variant="secondary" disabled={busy} onClick={() => save('draft')}>
                  Save as draft
                </Button>
                <Button disabled={busy} onClick={() => save('open')}>
                  {saving ? 'Publishing…' : 'Publish form'}
                </Button>
              </>
            ) : (
              <>
                {dirty ? (
                  <Button
                    variant="secondary"
                    onClick={() => setLeaveTo(`/dashboard/form/${form.id}`)}
                  >
                    View results
                  </Button>
                ) : (
                  <Link
                    href={`/dashboard/form/${form.id}`}
                    className={buttonVariants({ variant: 'secondary' })}
                  >
                    View results
                  </Link>
                )}
                <Button
                  disabled={busy}
                  onClick={() => save(form.status === 'open' ? 'open' : 'closed')}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </>
            )}
          </div>
        </div>

        {savedBuilderDraft ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-ballpoint-200 bg-ballpoint-50 px-4 py-3 text-sm text-ballpoint-900">
            <span>
              You have an unsaved draft from{' '}
              <span className="font-medium">{timeAgo(savedBuilderDraft.savedAt)}</span>.
              Resume it, or start over from the template you picked.
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSavedBuilderDraft(null);
                  clearBuilderDraft();
                }}
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setDraft(structuredClone(savedBuilderDraft.form));
                  setSavedBuilderDraft(null);
                }}
              >
                Resume draft
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_400px]">
          {/* Editor column */}
          <div className="min-w-0 space-y-5">
            {/* Form meta */}
            <section className="rounded-2xl border border-ink/[0.08] bg-card p-5 shadow-sm sm:p-6">
              <Input
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Form title — e.g. Hostel Maintenance Complaint"
                className="h-auto border-0 px-0 font-display text-xl font-bold tracking-tight shadow-none sm:text-2xl"
                aria-label="Form title"
              />
              <Textarea
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Description students see at the top — context, instructions, what happens after they submit."
                rows={3}
                className="mt-2 border-0 px-0 shadow-none"
                aria-label="Form description"
              />
              <div className="mt-4 grid gap-3 border-t border-ink/[0.07] pt-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fb-category" className="mb-1.5 block text-[13px] font-medium text-ink/70">
                    Category
                  </label>
                  <Select
                    id="fb-category"
                    value={form.category}
                    onChange={(e) => {
                      const category = e.target.value as FormCategory;
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              category,
                              // Sensible default while the form is still empty.
                              anonymous:
                                d.questions.length === 0 && mode === 'create'
                                  ? CATEGORIES[category].anonymousDefault
                                  : d.anonymous,
                            }
                          : d
                      );
                    }}
                  >
                    {CATEGORY_LIST.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink/45">
                    {CATEGORIES[form.category].examples}
                  </p>
                </div>
                <div>
                  <label htmlFor="fb-deadline" className="mb-1.5 block text-[13px] font-medium text-ink/70">
                    Deadline <span className="text-ink/40">(optional)</span>
                  </label>
                  <Input
                    id="fb-deadline"
                    type="datetime-local"
                    // Deadlines used to be date-only; those still open in the
                    // editor, at the end of the day they always meant.
                    value={
                      form.deadline
                        ? form.deadline.length === 10
                          ? `${form.deadline}T23:59`
                          : form.deadline.slice(0, 16)
                        : ''
                    }
                    onChange={(e) => patch({ deadline: e.target.value || null })}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-paper px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">Anonymous responses</p>
                  <p className="mt-0.5 text-xs text-ink/50">
                    Names and emails won’t be stored. Best for mess & library feedback.
                  </p>
                </div>
                <Switch
                  checked={form.anonymous}
                  onCheckedChange={(v) => patch({ anonymous: v })}
                  aria-label="Anonymous responses"
                />
              </div>
            </section>

            {/* Questions */}
            {form.questions.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border border-dashed border-ink/15 bg-card/60 px-6 py-12 text-center">
                <FileQuestion className="size-8 text-ink/20" aria-hidden />
                <p className="mt-3 text-sm font-medium text-ink/60">No questions yet</p>
                <p className="mt-1 max-w-xs text-[13px] text-ink/45">
                  Pick a question type below — short text for room numbers, a
                  rating for urgency, single choice for tracks.
                </p>
              </div>
            ) : (
              form.questions.map((q, i) => (
                <QuestionEditor
                  key={q.id}
                  q={q}
                  index={i}
                  total={form.questions.length}
                  onPatch={(p) => patchQuestion(q.id, p)}
                  onRemove={() => removeQuestion(q.id)}
                  onMove={(dir) => moveQuestion(i, dir)}
                />
              ))
            )}

            {/* Add-question palette */}
            <section className="rounded-2xl border border-dashed border-ink/15 bg-card/60 p-4 sm:p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/45">
                Add a question
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {QUESTION_TYPES.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => addQuestion(t.type)}
                    title={t.hint}
                    className="flex items-center gap-2 rounded-xl border border-ink/10 bg-card px-3 py-2.5 text-[13px] font-medium text-ink/70 shadow-sm transition hover:border-ballpoint-400 hover:text-ballpoint-700 outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40"
                  >
                    <t.icon className="size-4 shrink-0 text-ballpoint-600" aria-hidden />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Live preview */}
          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-ink/[0.07] px-5 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/45">
                  Live preview
                </p>
                <Eye className="size-4 text-ink/30" aria-hidden />
              </div>
              <div className="max-h-[560px] overflow-y-auto p-5">
                <p className="font-display text-lg font-bold tracking-tight">
                  {form.title || <span className="text-ink/30">Untitled form</span>}
                </p>
                {form.description ? (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">{form.description}</p>
                ) : null}
                <div className="mt-5 border-t border-ink/[0.07] pt-5">
                  {form.questions.length === 0 ? (
                    <p className="text-sm text-ink/40">
                      Questions you add will appear here, exactly as students
                      will see them.
                    </p>
                  ) : (
                    <LivePreview form={form} />
                  )}
                </div>
              </div>
              <p className="border-t border-ink/[0.07] bg-paper px-5 py-3 text-xs text-ink/45">
                Students see exactly this. Submissions are disabled in preview.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <Dialog
        open={leaveTo !== null}
        onClose={() => setLeaveTo(null)}
        title="Leave without saving?"
        description="This form has changes that haven’t been saved. Leaving now discards them."
      >
        <Button variant="secondary" onClick={() => setLeaveTo(null)}>
          Keep editing
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            const to = leaveTo;
            setLeaveTo(null);
            if (to) router.push(to);
          }}
        >
          Discard changes
        </Button>
      </Dialog>
    </div>
  );
}

/**
 * Preview pane: real inputs backed by throwaway state, so the organizer can
 * click through the form exactly as a student would without saving anything.
 */
function LivePreview({ form }: { form: FormDefinition }) {
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  return (
    <FormRenderer
      form={form}
      values={values}
      respondent={{ name: '', email: '' }}
      errors={{}}
      onChange={(qid, value) => setValues((v) => ({ ...v, [qid]: value }))}
      onRespondentChange={() => {}}
      showRespondent={false}
    />
  );
}

function QuestionEditor({
  q,
  index,
  total,
  onPatch,
  onRemove,
  onMove,
}: {
  q: Question;
  index: number;
  total: number;
  onPatch: (p: Partial<Question>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const changeType = (type: QuestionType) => {
    const meta = QUESTION_TYPE_MAP[type];
    const needsOptions = meta.hasOptions && q.options.length === 0;
    onPatch({ type, options: needsOptions ? ['Option 1', 'Option 2', 'Option 3'] : q.options });
  };

  return (
    <section className="rounded-2xl border border-ink/[0.08] bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-ink/35">Q{index + 1}</span>
        <Select
          value={q.type}
          onChange={(e) => changeType(e.target.value as QuestionType)}
          aria-label="Question type"
          className="h-8 w-32 text-[13px] sm:w-40"
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </Select>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move question up"
          >
            <ChevronUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Move question down"
          >
            <ChevronDown />
          </Button>
          <Button
            variant="danger-ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label="Delete question"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <Input
        value={q.title}
        onChange={(e) => onPatch({ title: e.target.value })}
        placeholder="Question text — e.g. Block and room number"
        className="mt-3 font-medium"
        aria-label="Question text"
      />
      <Input
        value={q.description ?? ''}
        onChange={(e) => onPatch({ description: e.target.value })}
        placeholder="Optional hint, shown under the question"
        className="mt-2 h-9 text-[13px]"
        aria-label="Question hint"
      />

      {QUESTION_TYPE_MAP[q.type].hasOptions ? (
        <div className="mt-3 rounded-xl bg-paper p-3.5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink/40">Options</p>
          <div className="mt-2 space-y-1.5">
            {q.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    'grid size-[18px] shrink-0 place-items-center border-2 border-ink/20 bg-card',
                    q.type === 'multi-choice' ? 'rounded-[6px]' : 'rounded-full'
                  )}
                />
                <Input
                  value={opt}
                  onChange={(e) =>
                    onPatch({
                      options: q.options.map((o, j) => (j === i ? e.target.value : o)),
                    })
                  }
                  placeholder={`Option ${i + 1}`}
                  className="h-9"
                  aria-label={`Option ${i + 1}`}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={q.options.length <= 2}
                  onClick={() => onPatch({ options: q.options.filter((_, j) => j !== i) })}
                  aria-label="Remove option"
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => onPatch({ options: [...q.options, `Option ${q.options.length + 1}`] })}
          >
            <Plus />
            Add option
          </Button>
        </div>
      ) : null}

      {q.type === 'rating' ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-paper p-3.5">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink/40">Scale</p>
          <Select
            value={String(q.maxRating)}
            onChange={(e) => onPatch({ maxRating: Number(e.target.value) })}
            aria-label="Rating scale"
            className="h-9 w-32"
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n} stars
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="mt-3.5 flex items-center gap-2.5 border-t border-ink/[0.06] pt-3.5">
        <Switch checked={q.required} onCheckedChange={(v) => onPatch({ required: v })} aria-label="Required" />
        <span className="text-[13px] font-medium text-ink/60">
          Required <span className="font-normal text-ink/40">— students can’t submit without it</span>
        </span>
      </div>
    </section>
  );
}

function BuilderSkeleton() {
  return (
    <div className="min-h-svh">
      <DashboardHeader />
      <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_400px]" aria-hidden>
        <div className="space-y-5">
          <div className="h-56 animate-pulse rounded-2xl border border-ink/[0.06] bg-card/70" />
          <div className="h-40 animate-pulse rounded-2xl border border-ink/[0.06] bg-card/70" />
          <div className="h-28 animate-pulse rounded-2xl border border-ink/[0.06] bg-card/70" />
        </div>
        <div className="hidden h-96 animate-pulse rounded-2xl border border-ink/[0.06] bg-card/70 lg:block" />
      </div>
    </div>
  );
}

function NotFoundPanel() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight">Form not found</h1>
      <p className="mt-2 text-sm text-ink/55">
        This form was deleted or never existed.
      </p>
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: 'secondary', className: 'mt-6' })}
      >
        <ArrowLeft />
        Back to dashboard
      </Link>
    </div>
  );
}
