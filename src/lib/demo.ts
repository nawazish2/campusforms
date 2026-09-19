import { newQuestion } from './factories';
import { FORM_TEMPLATES } from './templates';
import type { FormSummary } from './db/schema';
import type { Question } from './types';

/**
 * The sample that keeps /browse from being an empty room. It is not a database
 * row — submissions stay on the device — so a campus with no published forms
 * still has something a visitor can fill in.
 */
export const DEMO_FORM_ID = 'demo';

const DEMO_TEMPLATE_ID = 'mess-weekly-feedback';

export function isDemoFormId(id: string | undefined | null): boolean {
  return id === DEMO_FORM_ID;
}

export function demoForm(): FormSummary {
  const t = FORM_TEMPLATES.find((x) => x.id === DEMO_TEMPLATE_ID);
  if (!t) throw new Error(`Template ${DEMO_TEMPLATE_ID} is missing`);
  const questions: Question[] = t.questions.map((q, i) => {
    const base = newQuestion(q.type);
    return {
      ...base,
      id: `demo-q${i + 1}`,
      title: q.title,
      description: q.description ?? '',
      required: q.required ?? false,
      options: q.options ?? base.options,
      maxRating: q.maxRating ?? base.maxRating,
    };
  });
  return {
    id: DEMO_FORM_ID,
    title: t.title,
    description: t.formDescription,
    category: t.category,
    status: 'open',
    anonymous: t.anonymous,
    deadline: null,
    questions,
    pinned: false,
    maxResponses: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    responseCount: 0,
  };
}
