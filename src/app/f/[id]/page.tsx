'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  FileQuestion,
  CheckCircle2,
  RotateCcw,
  Send,
  Timer,
  Users,
} from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { FormRenderer } from '@/components/form-renderer';
import { Button, buttonVariants } from '@/components/ui/button';
import { SetupRequired } from '@/components/setup-required';
import { usePublicForm } from '@/lib/db/hooks';
import { addResponse } from '@/lib/db/forms';
import { useToast } from '@/components/ui/toast';
import { validateFill, type RespondentInput } from '@/lib/validation';
import { hasSubmitted, markSubmitted } from '@/lib/submissions';
import { CATEGORIES, CATEGORY_ACCENT } from '@/lib/constants';
import { cn, deadlineInfo, estimateFillMinutes, pluralize } from '@/lib/utils';
import type { AnswerValue } from '@/lib/types';

function PageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10" aria-hidden>
      <div className="h-4 w-28 animate-pulse rounded bg-ink/[0.06]" />
      <div className="mt-6 h-64 animate-pulse rounded-3xl border border-ink/[0.06] bg-card/70" />
    </main>
  );
}

function ClosedPanel({
  reason,
  formId,
}: {
  reason: string;
  formId?: string;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="grid place-items-center rounded-3xl border border-ink/[0.08] bg-card px-6 py-16 text-center shadow-sm">
        <span className="grid size-14 place-items-center rounded-2xl bg-ink/[0.05]">
          <Clock className="size-7 text-ink/40" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
          This form isn’t accepting responses
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/55">{reason}</p>
        <Link
          href="/browse"
          className={buttonVariants({ variant: 'secondary', className: 'mt-6' })}
        >
          <ArrowLeft />
          Browse open forms
        </Link>
        {formId ? (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-ink/30">
            REF {formId.toUpperCase()}
          </p>
        ) : null}
      </div>
    </main>
  );
}

export default function FillFormPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { db, form, error, configured, loading } = usePublicForm(params.id);
  const [submitting, setSubmitting] = useState(false);

  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [respondent, setRespondent] = useState<RespondentInput>({ name: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [fillAgain, setFillAgain] = useState(false);
  // localStorage isn't readable during SSR, so this is a client-only lookup.
  const alreadySubmitted = useSyncExternalStore(
    () => () => {},
    () => (params.id ? hasSubmitted(params.id) : false),
    () => false
  );

  if (!configured) return <SetupRequired variant="public" />;

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <PageSkeleton />
        <SiteFooter />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
          <div className="grid place-items-center rounded-3xl border border-ink/[0.08] bg-card px-6 py-16 text-center shadow-sm">
            <span className="grid size-14 place-items-center rounded-2xl bg-ink/[0.05]">
              <FileQuestion className="size-7 text-ink/40" aria-hidden />
            </span>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
              {error ? 'Couldn’t load this form' : 'Form not found'}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/55">
              {error ??
                'This form doesn’t exist anymore, or the link was mistyped. Check the notice board for what’s open.'}
            </p>
            <Link
              href="/browse"
              className={buttonVariants({ variant: 'secondary', className: 'mt-6' })}
            >
              <ArrowLeft />
              Browse open forms
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const dl = deadlineInfo(form.deadline);

  if (form.status === 'draft') {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <ClosedPanel
          reason="The organizer hasn’t published this form yet. Check back once it’s announced."
          formId={form.id}
        />
        <SiteFooter />
      </div>
    );
  }

  if (form.status === 'closed' || dl.expired) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <ClosedPanel
          reason={
            form.status === 'closed'
              ? 'The organizer closed this form. It may reopen — keep an eye on the notice board.'
              : `The deadline passed on ${dl.label?.replace('Deadline passed ', '')}. Late responses aren’t accepted.`
          }
          formId={form.id}
        />
        <SiteFooter />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (submitting) return;
    const errs = validateFill(form, values, respondent);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      requestAnimationFrame(() => {
        document
          .querySelector('[data-error="true"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    setSubmitting(true);
    try {
      const id = await addResponse(db, {
        formId: form.id,
        respondentName: form.anonymous ? null : respondent.name.trim(),
        respondentEmail: form.anonymous ? null : respondent.email.trim() || null,
        answers: values,
      });
      // Only mark it locally once the write actually landed — otherwise a
      // failed submit would lock this browser out of retrying.
      markSubmitted(form.id);
      setSubmittedId(id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That didn’t send. Try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14">
          <div className="rounded-3xl border border-ink/[0.08] bg-card px-6 py-14 text-center shadow-sm sm:px-12">
            <svg viewBox="0 0 100 100" className="mx-auto size-20" role="img" aria-label="Submitted">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="#178a50"
                strokeWidth="4"
                strokeLinecap="round"
                className="draw-ring"
                transform="rotate(-90 50 50)"
              />
              <path
                d="M31 52 L45 65 L70 38"
                fill="none"
                stroke="#178a50"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="draw-check"
              />
            </svg>
            <div className="animate-stamp mx-auto mt-5 inline-block rounded-lg border-[3px] border-tick px-4 py-1">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-tick">
                Received
              </p>
            </div>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight">
              Response submitted
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink/55">
              {form.anonymous
                ? 'Thanks — this response is anonymous. Your name and email weren’t collected.'
                : `Thanks, ${respondent.name.trim().split(/\s+/)[0]} — the organizer can see your name on this one.`}
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink/35">
              REF #{submittedId.slice(-6).toUpperCase()} · {form.title}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setValues({});
                  setRespondent({ name: '', email: '' });
                  setErrors({});
                  setSubmittedId(null);
                  setFillAgain(true);
                }}
              >
                <RotateCcw />
                Submit another response
              </Button>
              <Link href="/browse" className={buttonVariants()}>
                Browse more forms
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (alreadySubmitted && !fillAgain) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
          <div className="grid place-items-center rounded-3xl border border-ink/[0.08] bg-card px-6 py-16 text-center shadow-sm">
            <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50">
              <CheckCircle2 className="size-7 text-emerald-600" aria-hidden />
            </span>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
              You’ve already responded
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/55">
              This browser submitted “{form.title}” once already. Fill it in
              again only if the organizer asked you to.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button variant="secondary" onClick={() => setFillAgain(true)}>
                <RotateCcw />
                Fill it in again
              </Button>
              <Link href="/browse" className={buttonVariants()}>
                Browse open forms
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-12">
        <Link
          href="/browse"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/50 transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All open forms
        </Link>

        <div className="mt-4 overflow-hidden rounded-3xl border border-ink/[0.08] bg-card shadow-sm">
          {/* Category band — tints the form by what it's for */}
          <div
            className={cn('flex items-center gap-2 px-6 py-3.5 sm:px-8', CATEGORY_ACCENT[form.category].band)}
          >
            {(() => {
              const Icon = CATEGORIES[form.category].icon;
              return <Icon className="size-4" aria-hidden />;
            })()}
            <span className="text-[13px] font-semibold">
              {CATEGORIES[form.category].label} form
            </span>
            {form.anonymous ? (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-card/70 px-2.5 py-0.5 text-xs font-medium">
                Anonymous
              </span>
            ) : null}
          </div>

          <div className="p-6 sm:p-8">
            <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight">
              {form.title}
            </h1>
            {form.description ? (
              <p className="mt-2.5 text-[15px] leading-relaxed text-ink/60">{form.description}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-ink/[0.07] pb-4 font-mono text-[11px] text-ink/45">
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" aria-hidden />
                {pluralize(form.responseCount, 'response')} so far
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Timer className="size-3.5" aria-hidden />
                ~{estimateFillMinutes(form.questions)} min to fill
              </span>
              {dl.label ? (
                <span
                  className={`inline-flex items-center gap-1.5 ${
                    dl.label.startsWith('Closes today')
                      ? 'font-semibold text-amber-600'
                      : ''
                  }`}
                >
                  <CalendarDays className="size-3.5" aria-hidden />
                  {dl.label}
                </span>
              ) : null}
            </div>

            <div className="pt-7">
              <FormRenderer
                form={form}
                values={values}
                respondent={respondent}
                errors={errors}
                onChange={(qid, value) => {
                  setValues((v) => ({ ...v, [qid]: value }));
                  setErrors((e) => {
                    if (!(qid in e)) return e;
                    const next = { ...e };
                    delete next[qid];
                    return next;
                  });
                }}
                onRespondentChange={(patch) => {
                  setRespondent((r) => ({ ...r, ...patch }));
                  setErrors((e) => {
                    if (!('__respondent' in e) || !patch.name?.trim()) return e;
                    const next = { ...e };
                    delete next.__respondent;
                    return next;
                  });
                }}
              />
            </div>

            <div className="mt-8 border-t border-ink/[0.07] pt-6">
              <Button
                size="lg"
                className={cn('w-full sm:w-auto', CATEGORY_ACCENT[form.category].button)}
                onClick={handleSubmit}
                disabled={submitting}
              >
                <Send />
                {submitting ? 'Sending…' : 'Submit response'}
              </Button>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ink/35">
                {form.anonymous
                  ? 'Anonymous — no name stored'
                  : 'Your name is attached to this response'}{' '}
                · Goes straight to the organizer’s dashboard
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
