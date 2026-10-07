// @vitest-environment edge-runtime
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../convex/_generated/api';
import { errorOf, insertForm, newBackend, question, ref, signedInAs, storeFile } from './testing';
import { checkAnswers } from '../../convex/rules';

afterEach(() => vi.useRealTimers());

async function setup(extra: Parameters<typeof insertForm>[2] = {}) {
  const t = newBackend();
  const owner = await signedInAs(t);
  const formId = await insertForm(t, owner.userId, extra);
  const submit = (answers: unknown, over: Record<string, unknown> = {}) =>
    t.mutation(api.responses.submit, {
      formId,
      ref: ref(),
      respondentName: 'Asha',
      respondentEmail: 'asha@example.test',
      answers,
      ...over,
    });
  return { t, owner, formId, submit };
}

describe('responses.submit: gates', () => {
  it('stores a response, status new, empty note, and bumps responseCount', async () => {
    const { t, formId, submit } = await setup();
    const r = ref();
    expect(await submit({ q1: 'hello' }, { ref: r })).toBe(r);
    const [row] = await t.run((ctx) => ctx.db.query('responses').collect());
    expect(row).toMatchObject({ ref: r, status: 'new', publicNote: '', answers: { q1: 'hello' } });
    expect((await t.run((ctx) => ctx.db.get('forms', formId)))?.responseCount).toBe(1);
  });

  it('strips name and email on an anonymous form', async () => {
    const { t, submit } = await setup({ anonymous: true });
    await submit({ q1: 'x' });
    const [row] = await t.run((ctx) => ctx.db.query('responses').collect());
    expect(row.respondentName).toBeNull();
    expect(row.respondentEmail).toBeNull();
  });

  it('keeps name and email on a named form', async () => {
    const { t, submit } = await setup();
    await submit({ q1: 'x' });
    const [row] = await t.run((ctx) => ctx.db.query('responses').collect());
    expect(row.respondentName).toBe('Asha');
    expect(row.respondentEmail).toBe('asha@example.test');
  });

  it('rejects draft and closed forms', async () => {
    for (const status of ['draft', 'closed'] as const) {
      const { submit } = await setup({ status });
      expect(await errorOf(submit({ q1: 'x' }))).toBe('This form is not accepting responses');
    }
  });

  it('rejects an unknown or malformed form id without throwing a server error', async () => {
    const { t, submit } = await setup();
    expect(await errorOf(submit({ q1: 'x' }, { formId: 'demo' }))).toBe('That form does not exist');
    expect(await t.query(api.forms.get, { id: 'demo' })).toBeNull();
  });

  it('enforces the deadline with a 14 hour grace, both shapes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const day = await setup({ deadline: '2026-09-25' });
    // Day ends 2026-09-26T00:00Z; grace runs to 14:00Z.
    vi.setSystemTime(new Date('2026-09-26T13:59:00Z'));
    await day.submit({ q1: 'ok' });
    vi.setSystemTime(new Date('2026-09-26T14:01:00Z'));
    expect(await errorOf(day.submit({ q1: 'late' }))).toBe('This form closed on 2026-09-25');

    const clock = await setup({ deadline: '2026-09-25T18:00' });
    vi.setSystemTime(new Date('2026-09-26T07:59:00Z'));
    await clock.submit({ q1: 'ok' });
    vi.setSystemTime(new Date('2026-09-26T08:01:00Z'));
    expect(await errorOf(clock.submit({ q1: 'late' }))).toBe('This form closed on 2026-09-25T18:00');
  });

  it('stops at maxResponses', async () => {
    const { submit } = await setup({ maxResponses: 2 });
    await submit({ q1: 'a' });
    await submit({ q1: 'b' });
    expect(await errorOf(submit({ q1: 'c' }))).toBe('This form is full');
  });

  it('limits floods to 30 a minute per form, then recovers', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T10:00:00Z'));
    const { submit } = await setup();
    for (let i = 0; i < 30; i++) await submit({ q1: `r${i}` });
    expect(await errorOf(submit({ q1: 'one too many' }))).toMatch(/too many responses/);
    vi.setSystemTime(new Date('2026-10-01T10:01:01Z'));
    await submit({ q1: 'fine now' });
  });

  it('requires answers to be an object, within 20000 bytes', async () => {
    const { submit } = await setup();
    expect(await errorOf(submit('nope'))).toBe('Answers must be an object');
    expect(await errorOf(submit(['a']))).toBe('Answers must be an object');
    expect(await errorOf(submit({ q1: 'x'.repeat(20001) }))).toBe('That response is too long');
  });

  it('rejects a key that is not a question id', async () => {
    const { submit } = await setup();
    expect(await errorOf(submit({ q1: 'x', sneaky: 'y' }))).toBe('This form has no question sneaky');
  });

  it('rejects a missing required answer: blank, whitespace, empty array', async () => {
    const { submit } = await setup({
      questions: [question('q1', 'short-text', { required: true, title: 'Room' })],
    });
    expect(await errorOf(submit({}))).toBe('Answer required: Room');
    expect(await errorOf(submit({ q1: '   ' }))).toBe('Answer required: Room');
    const multi = await setup({
      questions: [question('q1', 'multi-choice', { required: true, title: 'Pick', options: ['a'] })],
    });
    expect(await errorOf(multi.submit({ q1: [] }))).toBe('Answer required: Pick');
  });
});

describe('responses.submit: ref', () => {
  it('rejects a malformed ref and lowercases an uppercase one', async () => {
    const { t, submit } = await setup();
    for (const bad of ['abc', 'g'.repeat(16), 'a'.repeat(17), '']) {
      expect(await errorOf(submit({ q1: 'x' }, { ref: bad }))).toBe(
        'A response needs a 16-character reference code'
      );
    }
    expect(await submit({ q1: 'x' }, { ref: 'ABCDEF0123456789' })).toBe('abcdef0123456789');
    const [row] = await t.run((ctx) => ctx.db.query('responses').collect());
    expect(row.ref).toBe('abcdef0123456789');
  });

  it('rejects a repeated ref and does not count it', async () => {
    const { t, formId, submit } = await setup();
    const r = ref();
    await submit({ q1: 'a' }, { ref: r });
    expect(await errorOf(submit({ q1: 'b' }, { ref: r }))).toBe('That reference code is already used');
    expect((await t.run((ctx) => ctx.db.get('forms', formId)))?.responseCount).toBe(1);
  });
});

describe('responses.submit: answer types', () => {
  const typed = (type: Parameters<typeof question>[1], extra = {}) =>
    setup({ questions: [question('q1', type, extra)] });

  it('rating: integer 1..maxRating, number or digit string', async () => {
    const { submit } = await typed('rating', { maxRating: 5, title: 'Stars' });
    await submit({ q1: 5 });
    await submit({ q1: '3' });
    expect(await errorOf(submit({ q1: 6 }))).toBe('Rating out of range: Stars');
    expect(await errorOf(submit({ q1: 0 }))).toBe('Rating out of range: Stars');
    expect(await errorOf(submit({ q1: 2.5 }))).toBe('Rating out of range: Stars');
    expect(await errorOf(submit({ q1: 'banana' }))).toBe('Not a rating: Stars');
    expect(await errorOf(submit({ q1: '-1' }))).toBe('Not a rating: Stars');
  });

  it('rating honours a custom maxRating', async () => {
    const { submit } = await typed('rating', { maxRating: 10 });
    await submit({ q1: 10 });
    expect(await errorOf(submit({ q1: 11 }))).toMatch(/Rating out of range/);
  });

  it('number: number or numeric string', async () => {
    const { submit } = await typed('number', { title: 'Age' });
    await submit({ q1: 12 });
    await submit({ q1: '-3.5' });
    expect(await errorOf(submit({ q1: 'twelve' }))).toBe('Not a number: Age');
    expect(await errorOf(submit({ q1: '1e5' }))).toBe('Not a number: Age');
  });

  it('single-choice and dropdown: one of the options', async () => {
    for (const type of ['single-choice', 'dropdown'] as const) {
      const { submit } = await typed(type, { options: ['A', 'B'], title: 'Pick' });
      await submit({ q1: 'A' });
      expect(await errorOf(submit({ q1: 'C' }))).toBe('Not one of the options: Pick');
      expect(await errorOf(submit({ q1: ['A'] }))).toBe('Not one of the options: Pick');
    }
  });

  it('multi-choice: array subset of options', async () => {
    const { submit } = await typed('multi-choice', { options: ['A', 'B'], title: 'Pick' });
    await submit({ q1: ['A', 'B'] });
    expect(await errorOf(submit({ q1: ['A', 'C'] }))).toBe('Not one of the options: Pick');
    expect(await errorOf(submit({ q1: 'A' }))).toBe('Not one of the options: Pick');
    expect(await errorOf(submit({ q1: [1] }))).toBe('Not one of the options: Pick');
  });

  it('email and date shapes', async () => {
    const email = await typed('email', { title: 'Mail' });
    await email.submit({ q1: 'a@b.co' });
    expect(await errorOf(email.submit({ q1: 'a@b' }))).toBe('Not an email address: Mail');
    const date = await typed('date', { title: 'When' });
    await date.submit({ q1: '2026-09-25' });
    expect(await errorOf(date.submit({ q1: '25/09/2026' }))).toBe('Not a date: When');
  });

  it('text types, and unknown types, need a string', async () => {
    for (const type of ['short-text', 'long-text']) {
      const { submit } = await typed(type as 'short-text', { title: 'Say' });
      await submit({ q1: 'words' });
      expect(await errorOf(submit({ q1: 5 }))).toBe('Not text: Say');
    }
  });

  it('treats a type it does not know as text', () => {
    const q = { ...question('q1', 'short-text', { title: 'Say' }), type: 'mystery' };
    expect(checkAnswers([q], { q1: 'words' })).toEqual({ q1: 'words' });
    expect(() => checkAnswers([q], { q1: 5 })).toThrow('Not text: Say');
  });

  it('an absent optional answer is fine, an absent optional bad one is not stored', async () => {
    const { t, submit } = await typed('rating');
    await submit({});
    const [row] = await t.run((ctx) => ctx.db.query('responses').collect());
    expect(row.answers).toEqual({});
  });
});

describe('photos', () => {
  async function withFile(contentType: string, size = 100) {
    const s = await setup({
      questions: [question('qf', 'file', { required: true, title: 'Photo' })],
    });
    const storageId = await storeFile(s.t, contentType, size);
    return { ...s, storageId };
  }

  it('accepts a real stored image id', async () => {
    const { submit, storageId } = await withFile('image/jpeg');
    await submit({ qf: storageId });
  });

  it('rejects a made-up id, a non-image and an oversized file', async () => {
    const ok = await withFile('image/jpeg');
    expect(await errorOf(ok.submit({ qf: 'not-an-id' }))).toBe('Not a photo: Photo');
    const pdf = await withFile('application/pdf');
    expect(await errorOf(pdf.submit({ qf: pdf.storageId }))).toBe('Not a photo: Photo');
    const big = await withFile('image/png', 5 * 1024 * 1024 + 1);
    expect(await errorOf(big.submit({ qf: big.storageId }))).toBe('Not a photo: Photo');
  });

  it('only gives upload URLs for open forms', async () => {
    const { t, formId } = await setup();
    expect(await t.mutation(api.responses.generateUploadUrl, { formId })).toMatch(/^http/);
    const closed = await setup({ status: 'closed' });
    expect(
      await errorOf(closed.t.mutation(api.responses.generateUploadUrl, { formId: closed.formId }))
    ).toBe('This form is not accepting responses');
    expect(
      await errorOf(t.mutation(api.responses.generateUploadUrl, { formId: 'demo' }))
    ).toBe('This form is not accepting responses');
  });
});
