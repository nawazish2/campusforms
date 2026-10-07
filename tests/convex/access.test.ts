// @vitest-environment edge-runtime
import { describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import { assertAllowlisted } from '../../convex/organizers';
import { errorOf, insertForm, newBackend, question, ref, signedInAs, storeFile } from './testing';

async function world() {
  const t = newBackend();
  const owner = await signedInAs(t, 'owner@example.test');
  const other = await signedInAs(t, 'other@example.test');
  const formId = await insertForm(t, owner.userId, {
    questions: [question('q1', 'short-text'), question('qf', 'file')],
  });
  const submit = (answers: unknown = { q1: 'secret answer' }, r = ref()) =>
    t.mutation(api.responses.submit, {
      formId,
      ref: r,
      respondentName: 'Asha',
      respondentEmail: 'asha@example.test',
      answers,
    });
  return { t, owner, other, formId, submit };
}

describe('lookupByRef', () => {
  it('returns exactly six fields and never answers or identity', async () => {
    const { t, submit } = await world();
    const r = ref();
    await submit({ q1: 'secret answer' }, r);
    const found = await t.query(api.responses.lookupByRef, { ref: r.toUpperCase() });
    expect(Object.keys(found!).sort()).toEqual(
      ['formCategory', 'formTitle', 'isAnonymous', 'publicNote', 'responseStatus', 'submittedAt'].sort()
    );
    expect(JSON.stringify(found)).not.toContain('secret answer');
    expect(JSON.stringify(found)).not.toContain('Asha');
  });

  it('is null for an unknown ref and after the form is deleted', async () => {
    const { t, owner, formId, submit } = await world();
    expect(await t.query(api.responses.lookupByRef, { ref: ref() })).toBeNull();
    const r = ref();
    await submit({ q1: 'x' }, r);
    await owner.as.mutation(api.forms.remove, { id: formId });
    expect(await t.query(api.responses.lookupByRef, { ref: r })).toBeNull();
  });
});

describe('owner-only access', () => {
  it('lets anyone read a form, any status, but only the owner list their responses', async () => {
    const { t, owner, other, formId, submit } = await world();
    await submit();
    await owner.as.mutation(api.forms.setStatus, { id: formId, status: 'draft' });
    expect(await t.query(api.forms.get, { id: formId })).toMatchObject({ status: 'draft' });
    expect(await owner.as.query(api.responses.listForForm, { formId })).toHaveLength(1);
    expect(await other.as.query(api.responses.listForForm, { formId })).toEqual([]);
    expect(await t.query(api.responses.listForForm, { formId })).toEqual([]);
    expect(await other.as.query(api.forms.getOwned, { id: formId })).toBeNull();
    expect(await other.as.query(api.responses.listRecent, {})).toEqual([]);
    expect(await other.as.query(api.responses.countSince, { since: 0 })).toBe(0);
    expect(await owner.as.query(api.responses.listRecent, {})).toHaveLength(1);
    expect(await owner.as.query(api.responses.countSince, { since: 0 })).toBe(1);
  });

  it('public list shows open forms only, pinned first', async () => {
    const { t, owner } = await world();
    const pinned = await insertForm(t, owner.userId, { title: 'Pinned', pinned: true });
    await insertForm(t, owner.userId, { title: 'Draft', status: 'draft' });
    await insertForm(t, owner.userId, { title: 'Newest' });
    const titles = (await t.query(api.forms.listOpen, {})).map((f) => f.title);
    expect(titles).toEqual(['Pinned', 'Newest', 'Test form']);
    expect(pinned).toBeTruthy();
  });

  it('rejects another identity and a signed-out caller on every owner mutation', async () => {
    const { t, other, formId, submit } = await world();
    await submit();
    const [row] = await t.run((ctx) => ctx.db.query('responses').collect());
    const calls = (as: Pick<typeof t, 'mutation'>) => [
      as.mutation(api.forms.update, { id: formId, title: 'Hijacked' }),
      as.mutation(api.forms.setStatus, { id: formId, status: 'closed' }),
      as.mutation(api.forms.setPinned, { id: formId, pinned: true }),
      as.mutation(api.forms.duplicate, { id: formId }),
      as.mutation(api.forms.remove, { id: formId }),
      as.mutation(api.responses.setStatus, { id: row._id, status: 'done' }),
      as.mutation(api.responses.setNote, { id: row._id, note: 'hi' }),
      as.mutation(api.responses.remove, { id: row._id }),
    ];
    for (const p of calls(other.as)) expect(await errorOf(p)).toMatch(/access/);
    for (const p of calls(t)) expect(await errorOf(p)).toBe('Sign in to continue');
    expect(
      await errorOf(
        t.mutation(api.forms.create, {
          title: 'x', description: '', category: 'general', status: 'draft', anonymous: false,
          deadline: null, questions: [], maxResponses: null,
        })
      )
    ).toBe('Sign in to continue');
    const unchanged = await t.run((ctx) => ctx.db.get('forms', formId));
    expect(unchanged?.title).toBe('Test form');
    expect(await t.run((ctx) => ctx.db.query('responses').collect())).toHaveLength(1);
  });

  it('gives a photo URL only to the form owner', async () => {
    const { t, owner, other, formId } = await world();
    const storageId = await storeFile(t, 'image/png');
    await t.mutation(api.responses.submit, {
      formId, ref: ref(), respondentName: null, respondentEmail: null,
      answers: { qf: storageId },
    });
    const [row] = await t.run((ctx) => ctx.db.query('responses').collect());
    const args = { responseId: row._id, questionId: 'qf' };
    expect(await owner.as.query(api.responses.photoUrl, args)).toMatch(/^http/);
    expect(await other.as.query(api.responses.photoUrl, args)).toBeNull();
    expect(await t.query(api.responses.photoUrl, args)).toBeNull();
    expect(await owner.as.query(api.responses.photoUrl, { ...args, questionId: 'q1' })).toBeNull();
  });
});

describe('form invariants', () => {
  it('trims the title, defaults it, and starts responseCount at 0', async () => {
    const { owner } = await world();
    const base = {
      description: '', category: 'general' as const, status: 'draft' as const,
      anonymous: false, deadline: null, questions: [], maxResponses: null,
    };
    const id = await owner.as.mutation(api.forms.create, { ...base, title: '  Hostel  ' });
    expect((await owner.as.query(api.forms.getOwned, { id }))?.title).toBe('Hostel');
    const blank = await owner.as.mutation(api.forms.create, { ...base, title: '   ' });
    expect((await owner.as.query(api.forms.getOwned, { id: blank }))).toMatchObject({
      title: 'Untitled form', responseCount: 0,
    });
  });

  it('never accepts responseCount from a caller', async () => {
    const { owner, formId } = await world();
    await expect(
      owner.as.mutation(api.forms.update, { id: formId, responseCount: 99 } as never)
    ).rejects.toThrow();
  });

  it('counts up on submit and down on delete, never below zero', async () => {
    const { t, owner, formId, submit } = await world();
    await submit();
    await submit();
    const count = async () => (await t.run((ctx) => ctx.db.get('forms', formId)))?.responseCount;
    expect(await count()).toBe(2);
    const rows = await t.run((ctx) => ctx.db.query('responses').collect());
    await owner.as.mutation(api.responses.remove, { id: rows[0]._id });
    expect(await count()).toBe(1);
    await t.run((ctx) => ctx.db.patch('forms', formId, { responseCount: 0 }));
    await owner.as.mutation(api.responses.remove, { id: rows[1]._id });
    expect(await count()).toBe(0);
  });

  it('locks anonymity after the first response', async () => {
    const { owner, formId, submit } = await world();
    await owner.as.mutation(api.forms.update, { id: formId, anonymous: true });
    await owner.as.mutation(api.forms.update, { id: formId, anonymous: true, title: 'same value is fine' });
    await submit();
    expect(await errorOf(owner.as.mutation(api.forms.update, { id: formId, anonymous: false }))).toBe(
      'Anonymity cannot change after a form has responses'
    );
  });

  it('lets the owner edit only status and note on a response', async () => {
    const { t, owner, submit } = await world();
    await submit();
    const [row] = await t.run((ctx) => ctx.db.query('responses').collect());
    await owner.as.mutation(api.responses.setStatus, { id: row._id, status: 'done' });
    await owner.as.mutation(api.responses.setNote, { id: row._id, note: 'Fixed' });
    const after = await t.run((ctx) => ctx.db.get('responses', row._id));
    expect(after).toMatchObject({ status: 'done', publicNote: 'Fixed', answers: row.answers, ref: row.ref });
    expect(await errorOf(owner.as.mutation(api.responses.setNote, { id: row._id, note: 'x'.repeat(281) }))).toBe(
      'That note is too long'
    );
  });

  it('deleting a form removes its responses and photos', async () => {
    const { t, owner, formId } = await world();
    const storageId = await storeFile(t, 'image/png');
    await t.mutation(api.responses.submit, {
      formId, ref: ref(), respondentName: null, respondentEmail: null, answers: { qf: storageId },
    });
    await owner.as.mutation(api.forms.remove, { id: formId });
    await t.finishAllScheduledFunctions(() => {});
    expect(await t.run((ctx) => ctx.db.query('responses').collect())).toHaveLength(0);
    expect(await t.run((ctx) => ctx.db.system.get('_storage', storageId))).toBeNull();
  });
});

describe('organizer requests', () => {
  const create = (t: ReturnType<typeof newBackend>, email: string, note = '') =>
    t.mutation(api.organizerRequests.create, { email, note });

  it('lowercases and trims, rejects bad emails and long notes', async () => {
    const t = newBackend();
    await create(t, '  Warden@Univ.EDU ', ' hostel office ');
    const [row] = await t.run((ctx) => ctx.db.query('organizerRequests').collect());
    expect(row).toMatchObject({ email: 'warden@univ.edu', note: 'hostel office' });
    expect(await errorOf(create(t, 'not-an-email'))).toBe('Enter a valid email address');
    expect(await errorOf(create(t, `${'a'.repeat(200)}@b.co`))).toBe('Enter a valid email address');
    expect(await errorOf(create(t, 'a@b.co', 'x'.repeat(501)))).toBe('That note is too long');
    expect(await errorOf(create(t, 'WARDEN@univ.edu'))).toMatch(/already asked/);
  });

  it('allows 10 requests per 10 minutes, then again after', async () => {
    const t = newBackend();
    for (let i = 0; i < 10; i++) await create(t, `p${i}@b.co`);
    expect(await errorOf(create(t, 'p10@b.co'))).toMatch(/Too many requests/);
  });
});

describe('organizer allowlist', () => {
  it('rejects an unlisted or missing email and accepts a listed one in any case', async () => {
    const t = newBackend();
    await t.run(async (ctx) => {
      await ctx.db.insert('allowedOrganizers', { email: 'ok@univ.edu' });
      await expect(assertAllowlisted(ctx, 'stranger@gmail.com')).rejects.toThrow(/organizer list/);
      await expect(assertAllowlisted(ctx, undefined)).rejects.toThrow(/organizer list/);
      await expect(assertAllowlisted(ctx, ' OK@univ.edu ')).resolves.toBeUndefined();
    });
  });
});
