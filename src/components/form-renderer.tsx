'use client';

import { Check, EyeOff } from 'lucide-react';
import type { AnswerValue, FormDefinition, Question } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StarInput } from '@/components/stars';
import type { RespondentInput } from '@/lib/validation';

interface FormRendererProps {
  form: FormDefinition;
  values: Record<string, AnswerValue>;
  respondent: RespondentInput;
  errors: Record<string, string>;
  onChange: (qid: string, value: AnswerValue) => void;
  onRespondentChange: (patch: Partial<RespondentInput>) => void;
  /** Preview mode — inputs stay interactive but this flag marks the tree. */
  disabled?: boolean;
  showRespondent?: boolean;
}

const TEXT_INPUT_TYPE: Partial<Record<Question['type'], string>> = {
  email: 'email',
  date: 'date',
  number: 'number',
};

const PLACEHOLDER: Partial<Record<Question['type'], string>> = {
  'short-text': 'Type your answer',
  email: 'you@univ.edu',
  number: 'e.g. 3',
  'long-text': 'Type your answer…',
};

function textValue(v: AnswerValue | undefined): string {
  return v === undefined || typeof v === 'object' ? '' : String(v);
}

export function FormRenderer({
  form,
  values,
  respondent,
  errors,
  onChange,
  onRespondentChange,
  disabled = false,
  showRespondent = true,
}: FormRendererProps) {
  return (
    <div className="space-y-6">
      {form.anonymous ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-ballpoint-200 bg-ballpoint-50 px-4 py-3">
          <EyeOff className="mt-0.5 size-4 shrink-0 text-ballpoint-600" aria-hidden />
          <p className="text-sm leading-relaxed text-ballpoint-900">
            This form is <strong className="font-semibold">anonymous</strong> —
            your name and email are not collected. The organizer still sees
            when it was submitted.
          </p>
        </div>
      ) : showRespondent ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="__respondent-name" className="mb-1.5 block text-[13px] font-medium text-ink/80">
              Your name <span className="text-red-500">*</span>
            </label>
            <Input
              id="__respondent-name"
              value={respondent.name}
              onChange={(e) => onRespondentChange({ name: e.target.value })}
              placeholder="e.g. Aarav Sharma"
              disabled={disabled}
              aria-invalid={Boolean(errors.__respondent)}
              aria-describedby={errors.__respondent ? '__respondent-error' : undefined}
            />
            {errors.__respondent ? (
              <p
                id="__respondent-error"
                role="alert"
                className="mt-1.5 text-[13px] font-medium text-red-600"
              >
                {errors.__respondent}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="__respondent-email" className="mb-1.5 block text-[13px] font-medium text-ink/80">
              Email <span className="text-ink/40">(optional)</span>
            </label>
            <Input
              id="__respondent-email"
              type="email"
              value={respondent.email}
              onChange={(e) => onRespondentChange({ email: e.target.value })}
              placeholder="you@univ.edu"
              disabled={disabled}
            />
          </div>
        </div>
      ) : null}

      {form.questions.map((q, i) => {
        const err = errors[q.id];
        return (
          <div
            key={q.id}
            data-error={err ? 'true' : undefined}
            className="border-t border-ink/[0.07] pt-6 first:border-t-0 first:pt-0"
          >
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-xs font-medium text-ink/35">
                Q{i + 1}
              </span>
              <p className="text-sm font-semibold text-ink">
                {q.title || <span className="text-ink/35">Untitled question</span>}
                {q.required ? <span className="ml-0.5 text-red-500">*</span> : null}
              </p>
            </div>
            {q.description ? (
              <p
                id={`${q.id}-hint`}
                className="mt-1 text-[13px] leading-relaxed text-ink/50 sm:pl-[38px]"
              >
                {q.description}
              </p>
            ) : null}

            <div className="mt-3 sm:pl-[38px]">
              <QuestionControl
                q={q}
                values={values}
                errors={errors}
                onChange={onChange}
                disabled={disabled}
                describedBy={
                  [q.description ? `${q.id}-hint` : null, err ? `${q.id}-error` : null]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              />
              {err ? (
                <p
                  id={`${q.id}-error`}
                  className="mt-2 text-[13px] font-medium text-red-600"
                  role="alert"
                >
                  {err}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuestionControl({
  q,
  values,
  errors,
  onChange,
  disabled,
  describedBy,
}: {
  q: Question;
  values: Record<string, AnswerValue>;
  errors: Record<string, string>;
  onChange: (qid: string, value: AnswerValue) => void;
  disabled: boolean;
  /** Ids of the hint and error text belonging to this question. */
  describedBy?: string;
}) {
  const value = values[q.id];
  const invalid = Boolean(errors[q.id]);

  if (q.type === 'single-choice') {
    return (
      <div
        className="grid gap-2 sm:grid-cols-2"
        role="group"
        aria-label={q.title || 'Choose an option'}
        aria-describedby={describedBy}
      >
        {q.options.map((opt, i) => (
          <ChoiceCard
            key={i}
            name={q.id}
            label={opt}
            checked={value === opt}
            multi={false}
            disabled={disabled}
            onToggle={() => onChange(q.id, opt)}
          />
        ))}
      </div>
    );
  }

  if (q.type === 'multi-choice') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div
        className="grid gap-2 sm:grid-cols-2"
        role="group"
        aria-label={q.title || 'Choose any that apply'}
        aria-describedby={describedBy}
      >
        {q.options.map((opt, i) => (
          <ChoiceCard
            key={i}
            name={q.id}
            label={opt}
            checked={selected.includes(opt)}
            multi
            disabled={disabled}
            onToggle={() =>
              onChange(
                q.id,
                selected.includes(opt)
                  ? selected.filter((o) => o !== opt)
                  : [...selected, opt]
              )
            }
          />
        ))}
      </div>
    );
  }

  if (q.type === 'dropdown') {
    return (
      <Select
        aria-label={q.title || 'Select an option'}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        disabled={disabled}
        value={textValue(value)}
        onChange={(e) => onChange(q.id, e.target.value)}
      >
        <option value="" disabled>
          Select an option…
        </option>
        {q.options.map((opt, i) => (
          <option key={i} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
    );
  }

  if (q.type === 'rating') {
    return (
      <StarInput
        value={typeof value === 'number' ? value : 0}
        onChange={(v) => onChange(q.id, v)}
        max={q.maxRating}
        disabled={disabled}
        describedBy={describedBy}
      />
    );
  }

  if (q.type === 'long-text') {
    return (
      <Textarea
        aria-label={q.title || 'Your answer'}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        rows={4}
        disabled={disabled}
        placeholder={PLACEHOLDER['long-text']}
        value={textValue(value)}
        onChange={(e) => onChange(q.id, e.target.value)}
      />
    );
  }

  return (
    <Input
      aria-label={q.title || 'Your answer'}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      type={TEXT_INPUT_TYPE[q.type] ?? 'text'}
      disabled={disabled}
      placeholder={PLACEHOLDER[q.type]}
      value={textValue(value)}
      onChange={(e) => {
        if (q.type === 'number') {
          onChange(q.id, e.target.value === '' ? '' : Number(e.target.value));
        } else {
          onChange(q.id, e.target.value);
        }
      }}
    />
  );
}

function ChoiceCard({
  name,
  label,
  checked,
  multi,
  disabled,
  onToggle,
}: {
  name: string;
  label: string;
  checked: boolean;
  multi: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition',
        checked
          ? 'border-ballpoint-500 bg-ballpoint-50 ring-1 ring-ballpoint-500'
          : 'border-ink/10 bg-card hover:border-ink/25 hover:bg-ink/[0.02]',
        disabled && 'pointer-events-none cursor-default'
      )}
    >
      <input
        type={multi ? 'checkbox' : 'radio'}
        name={name}
        className="sr-only"
        checked={checked}
        onChange={onToggle}
        disabled={disabled}
      />
      <span
        aria-hidden
        className={cn(
          'grid size-[18px] shrink-0 place-items-center border-2 transition',
          multi ? 'rounded-[6px]' : 'rounded-full',
          checked
            ? multi
              ? 'border-ballpoint-600 bg-ballpoint-600'
              : 'border-ballpoint-600'
            : 'border-ink/25 bg-card group-hover:border-ink/40'
        )}
      >
        {checked ? (
          multi ? (
            <Check className="size-3 text-white" strokeWidth={3.5} />
          ) : (
            <span className="size-2.5 rounded-full bg-ballpoint-600" />
          )
        ) : null}
      </span>
      <span className={cn(checked ? 'font-medium text-ballpoint-900' : 'text-ink/80')}>
        {label}
      </span>
    </label>
  );
}
