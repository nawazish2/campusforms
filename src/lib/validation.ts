import type { AnswerValue, FormDefinition, QuestionType } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RespondentInput {
  name: string;
  email: string;
}

/**
 * Validates a fill-in attempt. Returns a map of questionId → error message,
 * plus the reserved key `__respondent` for the name field.
 */
export function validateFill(
  form: FormDefinition,
  values: Record<string, AnswerValue>,
  respondent: RespondentInput
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.anonymous && !respondent.name.trim()) {
    errors.__respondent = 'Your name is required.';
  }

  for (const q of form.questions) {
    const v = values[q.id];
    const empty =
      v === undefined ||
      v === null ||
      v === '' ||
      (Array.isArray(v) && v.length === 0);

    if (q.required && empty) {
      errors[q.id] = 'This question is required.';
      continue;
    }
    if (empty) continue;

    if (q.type === 'email' && !EMAIL_RE.test(String(v).trim())) {
      errors[q.id] = 'Enter a valid email address.';
    }
    if (q.type === 'number' && !Number.isFinite(Number(v))) {
      errors[q.id] = 'Enter a number.';
    }
  }

  return errors;
}

const CHOICE_TYPES = new Set<QuestionType>([
  'single-choice',
  'multi-choice',
  'dropdown',
]);

function joinNumbers(ns: number[]): string {
  if (ns.length === 1) return String(ns[0]);
  return `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;
}

function firstDuplicate(values: string[]): string | null {
  const seen = new Set<string>();
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) return v;
    seen.add(key);
  }
  return null;
}

/**
 * Checks a form before it goes live. Returns problems in the order an
 * organizer would fix them; an empty array means the form is ready.
 * Drafts skip this — half-finished questions are the point of a draft.
 */
export function validateDraft(form: FormDefinition): string[] {
  const problems: string[] = [];

  const untitled = form.questions
    .map((q, i) => (q.title.trim() === '' ? i + 1 : 0))
    .filter((n) => n > 0);
  if (untitled.length > 0) {
    problems.push(
      untitled.length === 1
        ? `Question ${untitled[0]} needs a title before you can publish.`
        : `Questions ${joinNumbers(untitled)} need titles before you can publish.`
    );
  }

  form.questions.forEach((q, i) => {
    if (!CHOICE_TYPES.has(q.type)) return;
    const options = q.options.map((o) => o.trim());
    if (options.some((o) => o === '')) {
      problems.push(`Question ${i + 1} has a blank option — fill it in or remove it.`);
      return;
    }
    const dupe = firstDuplicate(options);
    if (dupe) {
      problems.push(`Question ${i + 1} lists “${dupe}” twice — options must be unique.`);
    }
  });

  return problems;
}
