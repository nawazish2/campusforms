import { getAuthUserId } from '@convex-dev/auth/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { fail } from './rules';

type Ctx = QueryCtx | MutationCtx;

/** The signed-in user's id, or a ConvexError. For mutations. */
export async function requireUserId(ctx: Ctx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) fail('Sign in to continue');
  return userId;
}

/**
 * The form if the caller owns it; null when signed out, the id is malformed,
 * the form is missing or it belongs to someone else. Queries use this so a
 * page renders "not found" instead of crashing on a thrown error.
 */
export async function ownedForm(ctx: Ctx, id: string): Promise<Doc<'forms'> | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  const formId = ctx.db.normalizeId('forms', id);
  if (formId === null) return null;
  const form = await ctx.db.get('forms', formId);
  return form !== null && form.ownerId === userId ? form : null;
}

/** Same check for mutations, where refusing loudly is right. */
export async function requireOwnedForm(ctx: Ctx, id: string): Promise<Doc<'forms'>> {
  await requireUserId(ctx);
  const form = await ownedForm(ctx, id);
  if (form === null) fail('You don’t have access to that form');
  return form;
}

/** Form documents as the UI's FormSummary. The owner id never leaves the server. */
export function toSummary(doc: Doc<'forms'>) {
  return {
    id: doc._id as string,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    status: doc.status,
    anonymous: doc.anonymous,
    deadline: doc.deadline ?? null,
    questions: doc.questions.map((q) => ({ ...q })),
    pinned: doc.pinned,
    maxResponses: doc.maxResponses ?? null,
    createdAt: new Date(doc._creationTime).toISOString(),
    responseCount: doc.responseCount,
  };
}

export function toResponse(doc: Doc<'responses'>) {
  return {
    id: doc._id as string,
    formId: doc.formId as string,
    ref: doc.ref,
    respondentName: doc.respondentName,
    respondentEmail: doc.respondentEmail,
    submittedAt: new Date(doc._creationTime).toISOString(),
    answers: doc.answers,
    status: doc.status,
    publicNote: doc.publicNote,
  };
}

/** Storage ids of the photos attached to a response. */
export function photoIds(
  ctx: Ctx,
  form: Pick<Doc<'forms'>, 'questions'>,
  answers: Doc<'responses'>['answers']
): Id<'_storage'>[] {
  const ids: Id<'_storage'>[] = [];
  for (const q of form.questions) {
    const value = answers[q.id];
    if (q.type !== 'file' || typeof value !== 'string') continue;
    const id = ctx.db.system.normalizeId('_storage', value);
    if (id !== null) ids.push(id);
  }
  return ids;
}
