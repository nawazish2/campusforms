import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

/**
 * The whole data model. Convex stores documents, so adding an optional field
 * here needs no migration: old documents simply don't have it. A new required
 * field needs a backfill (or make it optional first).
 *
 * There is no `submittedBy` or IP on `responses`, on purpose: anonymity is
 * "the data was never stored", and `responses.submit` is the only writer.
 */

export const categoryValidator = v.union(
  v.literal('hostel'),
  v.literal('mess'),
  v.literal('event'),
  v.literal('academics'),
  v.literal('general')
);

export const statusValidator = v.union(
  v.literal('draft'),
  v.literal('open'),
  v.literal('closed')
);

export const responseStatusValidator = v.union(
  v.literal('new'),
  v.literal('in-progress'),
  v.literal('done')
);

export const questionValidator = v.object({
  id: v.string(),
  type: v.union(
    v.literal('short-text'),
    v.literal('long-text'),
    v.literal('single-choice'),
    v.literal('multi-choice'),
    v.literal('dropdown'),
    v.literal('rating'),
    v.literal('date'),
    v.literal('number'),
    v.literal('email'),
    v.literal('file')
  ),
  title: v.string(),
  description: v.optional(v.string()),
  required: v.boolean(),
  options: v.array(v.string()),
  maxRating: v.number(),
});

export default defineSchema({
  ...authTables,

  forms: defineTable({
    ownerId: v.id('users'),
    title: v.string(),
    description: v.string(),
    category: categoryValidator,
    status: statusValidator,
    anonymous: v.boolean(),
    /** "2026-09-25" (end of that day) or "2026-09-25T18:00". No zone. */
    deadline: v.optional(v.string()),
    questions: v.array(questionValidator),
    pinned: v.boolean(),
    /** Absent means no cap. */
    maxResponses: v.optional(v.number()),
    /** Written only by responses.submit / remove. */
    responseCount: v.number(),
  })
    .index('by_owner', ['ownerId'])
    .index('by_status_and_pinned', ['status', 'pinned']),

  responses: defineTable({
    formId: v.id('forms'),
    /** 16 lowercase hex, supplied by the client so it can show the receipt. */
    ref: v.string(),
    respondentName: v.union(v.string(), v.null()),
    respondentEmail: v.union(v.string(), v.null()),
    /** questionId -> string | string[] | number. File answers are storage ids. */
    answers: v.record(v.string(), v.union(v.string(), v.number(), v.array(v.string()))),
    status: responseStatusValidator,
    publicNote: v.string(),
  })
    .index('by_form', ['formId'])
    .index('by_ref', ['ref']),

  /** Emails that may sign in as organizers. Managed with admin:allowOrganizer. */
  allowedOrganizers: defineTable({
    email: v.string(),
    note: v.optional(v.string()),
  }).index('by_email', ['email']),

  organizerRequests: defineTable({
    email: v.string(),
    note: v.string(),
  }).index('by_email', ['email']),
});
