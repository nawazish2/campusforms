import { afterEach, describe, expect, it, vi } from 'vitest';
import { formStats, summarizeQuestion } from './analytics';
import { newQuestion } from './factories';
import type { AnswerValue, FormResponse, Question } from './types';

afterEach(() => {
  vi.useRealTimers();
});

let n = 0;
function response(submittedAt: string, answers: Record<string, AnswerValue> = {}): FormResponse {
  n += 1;
  return {
    id: `r-${n}`,
    formId: 'f-1',
    respondentName: `Student ${n}`,
    respondentEmail: null,
    submittedAt,
    answers,
  };
}

function answersFor(q: Question, values: (AnswerValue | undefined)[]): FormResponse[] {
  return values.map((v) =>
    response('2026-09-01T10:00:00.000Z', v === undefined ? {} : { [q.id]: v })
  );
}

describe('formStats', () => {
  it('reports nothing for an empty form', () => {
    expect(formStats([])).toEqual({ total: 0, today: 0, last: null });
  });

  it('counts only today’s responses in `today`', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-05T14:00:00'));
    const stats = formStats([
      response('2026-09-05T13:00:00'),
      response('2026-09-05T00:30:00'),
      response('2026-09-04T23:59:00'),
    ]);
    expect(stats.total).toBe(3);
    expect(stats.today).toBe(2);
  });

  it('finds the latest submission regardless of array order', () => {
    expect(
      formStats([
        response('2026-09-01T10:00:00.000Z'),
        response('2026-09-03T10:00:00.000Z'),
        response('2026-09-02T10:00:00.000Z'),
      ]).last
    ).toBe('2026-09-03T10:00:00.000Z');
  });
});

describe('summarizeQuestion', () => {
  it('averages ratings over the responses that answered', () => {
    const q = { ...newQuestion('rating'), maxRating: 5 };
    const summary = summarizeQuestion(q, answersFor(q, [5, 3, undefined, 4]));
    if (summary.kind !== 'rating') throw new Error('expected a rating summary');
    expect(summary.count).toBe(3);
    expect(summary.average).toBe(4);
    expect(summary.distribution[0]).toEqual({ value: 5, count: 1 });
  });

  it('returns a zero average rather than NaN when nobody answered', () => {
    const q = newQuestion('rating');
    const summary = summarizeQuestion(q, answersFor(q, [undefined, undefined]));
    if (summary.kind !== 'rating') throw new Error('expected a rating summary');
    expect(summary.average).toBe(0);
  });

  it('counts every pick of a multi-choice question', () => {
    const q = { ...newQuestion('multi-choice'), options: ['Water', 'Power', 'Wifi'] };
    const summary = summarizeQuestion(q, answersFor(q, [['Water', 'Wifi'], ['Water'], undefined]));
    if (summary.kind !== 'choice') throw new Error('expected a choice summary');
    // Two responses answered, so "Water" is 100% even though three exist.
    expect(summary.total).toBe(2);
    expect(summary.bars).toEqual([
      { label: 'Water', count: 2, pct: 100 },
      { label: 'Power', count: 0, pct: 0 },
      { label: 'Wifi', count: 1, pct: 50 },
    ]);
  });

  it('keeps an option with no votes on the chart', () => {
    const q = { ...newQuestion('single-choice'), options: ['Yes', 'No'] };
    const summary = summarizeQuestion(q, answersFor(q, ['Yes']));
    if (summary.kind !== 'choice') throw new Error('expected a choice summary');
    expect(summary.bars.map((b) => b.label)).toEqual(['Yes', 'No']);
  });

  it('lists text answers with who wrote them', () => {
    const q = newQuestion('long-text');
    const summary = summarizeQuestion(q, answersFor(q, ['Tap leaking', undefined, 'Fan broken']));
    if (summary.kind !== 'text') throw new Error('expected a text summary');
    expect(summary.count).toBe(2);
    expect(summary.answers.map((a) => a.value)).toEqual(['Tap leaking', 'Fan broken']);
  });
});
