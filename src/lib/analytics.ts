import type { FormResponse, Question } from './types';

export interface FormStats {
  total: number;
  today: number;
  last: string | null;
}

export function formStats(responses: FormResponse[]): FormStats {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = responses.filter(
    (r) => new Date(r.submittedAt).getTime() >= startOfToday.getTime()
  ).length;
  const last = responses.reduce<string | null>((acc, r) => {
    if (!acc || r.submittedAt > acc) return r.submittedAt;
    return acc;
  }, null);
  return { total: responses.length, today, last };
}

export type QuestionSummary =
  | {
      kind: 'rating';
      average: number;
      count: number;
      distribution: { value: number; count: number }[];
    }
  | { kind: 'choice'; total: number; bars: { label: string; count: number; pct: number }[] }
  | {
      kind: 'text';
      count: number;
      answers: { value: string; respondent: string | null; submittedAt: string }[];
    };

export function summarizeQuestion(q: Question, responses: FormResponse[]): QuestionSummary {
  const values = responses
    .map((r) => r.answers[q.id])
    .filter(
      (v) =>
        v !== undefined &&
        v !== null &&
        v !== '' &&
        !(Array.isArray(v) && v.length === 0)
    );

  if (q.type === 'rating') {
    const nums = values.filter((v): v is number => typeof v === 'number');
    const distribution = Array.from({ length: q.maxRating }, (_, i) => q.maxRating - i).map(
      (value) => ({ value, count: nums.filter((n) => n === value).length })
    );
    const average = nums.length
      ? nums.reduce((a, b) => a + b, 0) / nums.length
      : 0;
    return { kind: 'rating', average, count: nums.length, distribution };
  }

  if (q.type === 'single-choice' || q.type === 'multi-choice' || q.type === 'dropdown') {
    const counts = new Map<string, number>();
    for (const v of values) {
      for (const item of Array.isArray(v) ? v : [String(v)]) {
        counts.set(item, (counts.get(item) ?? 0) + 1);
      }
    }
    const bars = q.options.map((label) => {
      const count = counts.get(label) ?? 0;
      return {
        label,
        count,
        pct: values.length ? Math.round((count / values.length) * 100) : 0,
      };
    });
    return { kind: 'choice', total: values.length, bars };
  }

  return {
    kind: 'text',
    count: values.length,
    answers: responses
      .filter((r) => r.answers[q.id] !== undefined && r.answers[q.id] !== '')
      .map((r) => ({
        value: String(r.answers[q.id]),
        respondent: r.respondentName,
        submittedAt: r.submittedAt,
      })),
  };
}
