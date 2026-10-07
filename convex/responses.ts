import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import type { Id } from './_generated/dataModel';
import { photoIds, ownedForm, requireUserId, toResponse } from './lib';
import {
  FLOOD_LIMIT,
  FLOOD_WINDOW_MS,
  PHOTO_MAX_BYTES,
  PHOTO_TYPES,
  REF_PATTERN,
  checkAnswers,
  deadlinePassed,
  fail,
} from './rules';
import { responseStatusValidator } from './schema';

const NOTE_MAX = 280;

/**
 * Public: file a response. This one mutation does everything the old Postgres
 * triggers did, in order, and it is the only way a response row is created.
 * Returns the (lowercased) ref.
 */
export const submit = mutation({
  args: {
    formId: v.string(),
    ref: v.string(),
    respondentName: v.union(v.string(), v.null()),
    respondentEmail: v.union(v.string(), v.null()),
    // Checked by hand so a malformed payload gets a sentence, not a validator dump.
    answers: v.any(),
  },
  handler: async (ctx, args) => {
    const formId = ctx.db.normalizeId('forms', args.formId);
    const form = formId === null ? null : await ctx.db.get('forms', formId);
    if (form === null) fail('That form does not exist');
    if (form.status !== 'open') fail('This form is not accepting responses');

    const ref = args.ref.toLowerCase();
    if (!REF_PATTERN.test(ref)) fail('A response needs a 16-character reference code');

    const now = Date.now();
    if (form.deadline != null && deadlinePassed(form.deadline, now)) {
      fail(`This form closed on ${form.deadline}`);
    }

    if (form.maxResponses != null && form.responseCount >= form.maxResponses) {
      fail('This form is full');
    }

    // Responses carry no IP and no submitter, by design, so the only thing
    // countable is the form itself. ~30 a minute stops a script without
    // touching a lecture hall filling the same form at once.
    const recent = await ctx.db
      .query('responses')
      .withIndex('by_form', (q) =>
        q.eq('formId', form._id).gt('_creationTime', now - FLOOD_WINDOW_MS)
      )
      .take(FLOOD_LIMIT);
    if (recent.length >= FLOOD_LIMIT) {
      fail('This form is receiving too many responses right now. Try again in a minute.');
    }

    const answers = checkAnswers(form.questions, args.answers) as Record<
      string,
      string | number | string[]
    >;

    // A file answer is a storage id; it has to be a real, photo-sized upload.
    for (const q of form.questions) {
      const value = answers[q.id];
      if (q.type !== 'file' || value === undefined || value === '') continue;
      const label = q.title || 'untitled question';
      const fileId = typeof value === 'string' ? ctx.db.system.normalizeId('_storage', value) : null;
      const meta = fileId === null ? null : await ctx.db.system.get('_storage', fileId);
      if (
        meta === null ||
        !PHOTO_TYPES.includes(meta.contentType ?? '') ||
        meta.size > PHOTO_MAX_BYTES
      ) {
        fail(`Not a photo: ${label}`);
      }
    }

    const clash = await ctx.db
      .query('responses')
      .withIndex('by_ref', (q) => q.eq('ref', ref))
      .first();
    if (clash !== null) fail('That reference code is already used');

    await ctx.db.insert('responses', {
      formId: form._id,
      ref,
      // Anonymity is "never stored": there is no other column to leak into.
      respondentName: form.anonymous ? null : args.respondentName,
      respondentEmail: form.anonymous ? null : args.respondentEmail,
      answers,
      status: 'new',
      publicNote: '',
    });
    await ctx.db.patch('forms', form._id, { responseCount: form.responseCount + 1 });
    return ref;
  },
});

/** Public, open forms only: a one-time URL to POST one photo to. */
export const generateUploadUrl = mutation({
  args: { formId: v.string() },
  handler: async (ctx, { formId }) => {
    const id = ctx.db.normalizeId('forms', formId);
    const form = id === null ? null : await ctx.db.get('forms', id);
    if (form === null || form.status !== 'open') fail('This form is not accepting responses');
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Public: the triage status behind a REF. Returns these six fields and
 * nothing else — never answers, never who wrote it.
 */
export const lookupByRef = query({
  args: { ref: v.string() },
  handler: async (ctx, { ref }) => {
    const response = await ctx.db
      .query('responses')
      .withIndex('by_ref', (q) => q.eq('ref', ref.trim().toLowerCase()))
      .first();
    if (response === null) return null;
    // A deleted form takes its lookups with it.
    const form = await ctx.db.get('forms', response.formId);
    if (form === null) return null;
    return {
      formTitle: form.title,
      formCategory: form.category,
      responseStatus: response.status,
      submittedAt: new Date(response._creationTime).toISOString(),
      isAnonymous: form.anonymous,
      publicNote: response.publicNote,
    };
  },
});

/** Owner: responses to one form, newest first. */
export const listForForm = query({
  args: { formId: v.string() },
  handler: async (ctx, { formId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const form = await ownedForm(ctx, formId);
    if (form === null) return [];
    const rows = await ctx.db
      .query('responses')
      .withIndex('by_form', (q) => q.eq('formId', form._id))
      .order('desc')
      .take(2000);
    return rows.map(toResponse);
  },
});

/** Owner: newest responses across every form they own. */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 7 }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const forms = await ctx.db
      .query('forms')
      .withIndex('by_owner', (q) => q.eq('ownerId', userId))
      .take(500);
    const perForm = await Promise.all(
      forms.map((f) =>
        ctx.db
          .query('responses')
          .withIndex('by_form', (q) => q.eq('formId', f._id))
          .order('desc')
          .take(limit)
      )
    );
    return perForm
      .flat()
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, limit)
      .map(toResponse);
  },
});

/** Owner: how many responses to their forms landed since `since` (epoch ms). */
export const countSince = query({
  args: { since: v.number() },
  handler: async (ctx, { since }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return 0;
    const forms = await ctx.db
      .query('forms')
      .withIndex('by_owner', (q) => q.eq('ownerId', userId))
      .take(500);
    const counts = await Promise.all(
      forms.map(async (f) => {
        const rows = await ctx.db
          .query('responses')
          .withIndex('by_form', (q) => q.eq('formId', f._id).gte('_creationTime', since))
          .take(1000);
        return rows.length;
      })
    );
    return counts.reduce((a, b) => a + b, 0);
  },
});

async function requireOwnedResponse(ctx: Parameters<typeof requireUserId>[0], id: string) {
  await requireUserId(ctx);
  const responseId = ctx.db.normalizeId('responses', id);
  const response = responseId === null ? null : await ctx.db.get('responses', responseId);
  const form = response === null ? null : await ownedForm(ctx, response.formId);
  if (response === null || form === null) fail('You don’t have access to that response');
  return { response, form };
}

/** Owner: triage. Only `status` and `publicNote` can ever change. */
export const setStatus = mutation({
  args: { id: v.string(), status: responseStatusValidator },
  handler: async (ctx, { id, status }) => {
    const { response } = await requireOwnedResponse(ctx, id);
    await ctx.db.patch('responses', response._id, { status });
  },
});

export const setNote = mutation({
  args: { id: v.string(), note: v.string() },
  handler: async (ctx, { id, note }) => {
    const { response } = await requireOwnedResponse(ctx, id);
    if (note.length > NOTE_MAX) fail('That note is too long');
    await ctx.db.patch('responses', response._id, { publicNote: note });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const { response, form } = await requireOwnedResponse(ctx, id);
    for (const fileId of photoIds(ctx, form, response.answers)) {
      await ctx.storage.delete(fileId);
    }
    await ctx.db.delete('responses', response._id);
    await ctx.db.patch('forms', form._id, {
      responseCount: Math.max(form.responseCount - 1, 0),
    });
  },
});

/**
 * Owner: a URL for one photo answer, only if the response belongs to a form
 * they own and that question really holds a stored file.
 */
export const photoUrl = query({
  args: { responseId: v.string(), questionId: v.string() },
  handler: async (ctx, { responseId, questionId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const id: Id<'responses'> | null = ctx.db.normalizeId('responses', responseId);
    const response = id === null ? null : await ctx.db.get('responses', id);
    if (response === null) return null;
    const form = await ownedForm(ctx, response.formId);
    const question = form?.questions.find((q) => q.id === questionId);
    if (!form || question?.type !== 'file') return null;
    const value = response.answers[questionId];
    const fileId = typeof value === 'string' ? ctx.db.system.normalizeId('_storage', value) : null;
    return fileId === null ? null : await ctx.storage.getUrl(fileId);
  },
});
