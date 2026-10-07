import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation, mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { ownedForm, requireOwnedForm, requireUserId, toSummary } from './lib';
import { deadlineEnd, fail } from './rules';
import { categoryValidator, questionValidator, statusValidator } from './schema';

/**
 * Forms. Anyone may read any form by id (the fill page explains draft and
 * closed); only the owner writes. `responseCount` is never accepted from a
 * caller: responses.submit / remove are its only writers.
 */

function cleanTitle(title: string): string {
  return title.trim() || 'Untitled form';
}

function checkDeadline(deadline: string | null | undefined): void {
  if (deadline != null && deadlineEnd(deadline) === null) {
    fail('That deadline isn’t a valid date');
  }
}

function checkCap(max: number | null | undefined): void {
  if (max != null && (!Number.isInteger(max) || max < 1)) {
    fail('Max responses has to be a whole number of 1 or more.');
  }
}

/** Public: every open form, pinned first, then newest. */
export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const forOpen = (pinned: boolean) =>
      ctx.db
        .query('forms')
        .withIndex('by_status_and_pinned', (q) => q.eq('status', 'open').eq('pinned', pinned))
        .order('desc')
        .take(200);
    const [pinned, rest] = await Promise.all([forOpen(true), forOpen(false)]);
    return [...pinned, ...rest].map(toSummary);
  },
});

/**
 * Public: one form by id, any status. Takes a plain string because the id
 * comes from the URL; a malformed one is "not found", not an error.
 */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const formId = ctx.db.normalizeId('forms', id);
    if (formId === null) return null;
    const form = await ctx.db.get('forms', formId);
    return form ? toSummary(form) : null;
  },
});

/** Owner: the signed-in organizer's forms, newest first. Empty when signed out. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const forms = await ctx.db
      .query('forms')
      .withIndex('by_owner', (q) => q.eq('ownerId', userId))
      .order('desc')
      .take(500);
    return forms.map(toSummary);
  },
});

/** Owner: the form, or null if it isn't theirs. */
export const getOwned = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const form = await ownedForm(ctx, id);
    return form ? toSummary(form) : null;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: categoryValidator,
    status: statusValidator,
    anonymous: v.boolean(),
    deadline: v.union(v.string(), v.null()),
    questions: v.array(questionValidator),
    maxResponses: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    checkDeadline(args.deadline);
    checkCap(args.maxResponses);
    const id = await ctx.db.insert('forms', {
      ownerId,
      title: cleanTitle(args.title),
      description: args.description,
      category: args.category,
      status: args.status,
      anonymous: args.anonymous,
      deadline: args.deadline ?? undefined,
      questions: args.questions,
      maxResponses: args.maxResponses ?? undefined,
      pinned: false,
      responseCount: 0,
    });
    return id as string;
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(categoryValidator),
    status: v.optional(statusValidator),
    anonymous: v.optional(v.boolean()),
    deadline: v.optional(v.union(v.string(), v.null())),
    questions: v.optional(v.array(questionValidator)),
    maxResponses: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { id, ...patch }) => {
    const form = await requireOwnedForm(ctx, id);
    checkDeadline(patch.deadline);
    checkCap(patch.maxResponses);
    if (
      patch.anonymous !== undefined &&
      patch.anonymous !== form.anonymous &&
      form.responseCount > 0
    ) {
      fail('Anonymity cannot change after a form has responses');
    }
    await ctx.db.patch('forms', form._id, {
      ...(patch.title !== undefined && { title: cleanTitle(patch.title) }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.category !== undefined && { category: patch.category }),
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.anonymous !== undefined && { anonymous: patch.anonymous }),
      // null clears the field; undefined (key absent) leaves it alone.
      ...(patch.deadline !== undefined && { deadline: patch.deadline ?? undefined }),
      ...(patch.questions !== undefined && { questions: patch.questions }),
      ...(patch.maxResponses !== undefined && { maxResponses: patch.maxResponses ?? undefined }),
    });
  },
});

export const setStatus = mutation({
  args: { id: v.string(), status: statusValidator },
  handler: async (ctx, { id, status }) => {
    const form = await requireOwnedForm(ctx, id);
    await ctx.db.patch('forms', form._id, { status });
  },
});

export const setPinned = mutation({
  args: { id: v.string(), pinned: v.boolean() },
  handler: async (ctx, { id, pinned }) => {
    const form = await requireOwnedForm(ctx, id);
    await ctx.db.patch('forms', form._id, { pinned });
  },
});

/** Copies a form back to draft, with fresh question ids. Returns the new id. */
export const duplicate = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const src = await requireOwnedForm(ctx, id);
    const copy = await ctx.db.insert('forms', {
      ownerId: src.ownerId,
      title: `${src.title} (copy)`,
      description: src.description,
      category: src.category,
      status: 'draft',
      anonymous: src.anonymous,
      deadline: src.deadline,
      questions: src.questions.map((q) => ({
        ...q,
        id: `q${Math.random().toString(36).slice(2, 10)}`,
      })),
      maxResponses: src.maxResponses,
      pinned: false,
      responseCount: 0,
    });
    return copy as string;
  },
});

/**
 * Deletes the form now and its responses (and their photos) in batches, the
 * way `on delete cascade` did. A form with thousands of responses would not
 * fit in one mutation.
 */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const form = await requireOwnedForm(ctx, id);
    await ctx.db.delete('forms', form._id);
    await ctx.scheduler.runAfter(0, internal.forms.purgeResponses, {
      formId: form._id,
      fileQuestionIds: form.questions.filter((q) => q.type === 'file').map((q) => q.id),
    });
  },
});

const PURGE_BATCH = 100;

export const purgeResponses = internalMutation({
  args: { formId: v.id('forms'), fileQuestionIds: v.array(v.string()) },
  handler: async (ctx, { formId, fileQuestionIds }) => {
    const batch = await ctx.db
      .query('responses')
      .withIndex('by_form', (q) => q.eq('formId', formId))
      .take(PURGE_BATCH);
    for (const response of batch) {
      for (const qid of fileQuestionIds) {
        const value = response.answers[qid];
        const fileId =
          typeof value === 'string' ? ctx.db.system.normalizeId('_storage', value) : null;
        if (fileId !== null) await ctx.storage.delete(fileId);
      }
      await ctx.db.delete('responses', response._id);
    }
    if (batch.length === PURGE_BATCH) {
      await ctx.scheduler.runAfter(0, internal.forms.purgeResponses, { formId, fileQuestionIds });
    }
  },
});
