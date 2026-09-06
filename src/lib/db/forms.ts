import type { SupabaseClient } from '@supabase/supabase-js';
import { uid } from '@/lib/utils';
import {
  toForm,
  toResponse,
  toSummary,
  type Database,
  type FormRow,
  type FormSummary,
} from './schema';
import type {
  AnswerValue,
  FormDefinition,
  FormResponse,
  FormStatus,
  ResponseStatus,
} from '@/lib/types';

type Client = SupabaseClient<Database>;

/**
 * Every function the UI needs. This is the only path to the data — the
 * localStorage store it replaced is gone.
 *
 * Authorization is not re-checked here on purpose: the RLS policies in
 * `supabase/migrations/0001_init.sql` decide what each caller may touch, so a
 * forbidden write fails at the database rather than depending on this file
 * being called correctly.
 */

/** Turns a PostgREST result into the row(s) or an exception. */
function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
}

/** Public: every form on the notice board, pinned first, then newest. */
export async function listOpenForms(db: Client): Promise<FormSummary[]> {
  const rows = unwrap(
    await db
      .from('forms')
      .select('*')
      .eq('status', 'open')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
  );
  return rows.map(toSummary);
}

/** The signed-in organizer's own forms. */
export async function listMyForms(db: Client, ownerId: string): Promise<FormSummary[]> {
  const rows = unwrap(
    await db
      .from('forms')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
  );
  return rows.map(toSummary);
}

/**
 * The newest responses across every form the caller owns — the dashboard's
 * activity rail. RLS already scopes this to their own forms, so there's no
 * owner filter to get wrong here.
 */
export async function listRecentResponses(db: Client, limit = 7): Promise<FormResponse[]> {
  const rows = unwrap(
    await db
      .from('responses')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(limit)
  );
  return rows.map(toResponse);
}

/** How many responses landed since `since`, without fetching any of them. */
export async function countResponsesSince(db: Client, since: string): Promise<number> {
  const { count, error } = await db
    .from('responses')
    .select('id', { count: 'exact', head: true })
    .gte('submitted_at', since);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getForm(db: Client, id: string): Promise<FormDefinition | null> {
  const { data, error } = await db.from('forms').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toForm(data) : null;
}

/**
 * The fill page's version of `getForm`: it also needs the response count,
 * which it can't derive itself because a visitor can't read a response row.
 */
export async function getPublicForm(db: Client, id: string): Promise<FormSummary | null> {
  const { data, error } = await db.from('forms').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSummary(data) : null;
}

/**
 * Response counts for the public pages. `/browse` and the fill page show
 * "6 responses" to people who can't read a single response row, so the count
 * is kept on the form itself by trigger.
 */
export async function getResponseCounts(db: Client): Promise<Map<string, number>> {
  const rows = unwrap(await db.from('forms').select('id, response_count'));
  return new Map(rows.map((r) => [r.id, r.response_count]));
}

/** Creates a form. The id comes from the database, not the browser. */
export async function createForm(
  db: Client,
  ownerId: string,
  form: Omit<FormDefinition, 'id' | 'createdAt'>
): Promise<FormDefinition> {
  const row = unwrap(
    await db
      .from('forms')
      .insert({
        owner_id: ownerId,
        title: form.title,
        description: form.description,
        category: form.category,
        status: form.status,
        anonymous: form.anonymous,
        deadline: form.deadline,
        questions: form.questions,
      })
      .select()
      .single()
  );
  return toForm(row);
}

export async function updateForm(
  db: Client,
  id: string,
  patch: Partial<FormDefinition>
): Promise<FormDefinition> {
  const update: Database['public']['Tables']['forms']['Update'] = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.anonymous !== undefined) update.anonymous = patch.anonymous;
  if (patch.deadline !== undefined) update.deadline = patch.deadline;
  if (patch.questions !== undefined) update.questions = patch.questions;

  const row = unwrap(await db.from('forms').update(update).eq('id', id).select().single());
  return toForm(row);
}

export async function setFormStatus(db: Client, id: string, status: FormStatus): Promise<void> {
  unwrap(await db.from('forms').update({ status }).eq('id', id).select('id'));
}

/** Pins or unpins a form at the top of the notice board. */
export async function setFormPinned(db: Client, id: string, pinned: boolean): Promise<void> {
  unwrap(await db.from('forms').update({ pinned }).eq('id', id).select('id'));
}

/**
 * The public half of the REF code on the success screen: the student enters
 * the six characters and gets their response's triage status back. A
 * security-definer RPC does the reading (RLS gives response reads to the
 * organizer alone); the function itself is the guardrail — it returns no
 * respondent identity, and answers only for non-anonymous forms.
 */
export async function lookupResponseByRef(db: Client, ref: string) {
  const { data, error } = await db.rpc('lookup_response_by_ref', { p_ref: ref });
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function deleteForm(db: Client, id: string): Promise<void> {
  const { error } = await db.from('forms').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Copies a form back to draft, with fresh question ids. */
export async function duplicateForm(
  db: Client,
  ownerId: string,
  id: string
): Promise<FormDefinition | null> {
  const src = await getForm(db, id);
  if (!src) return null;
  return createForm(db, ownerId, {
    ...src,
    title: `${src.title} (copy)`,
    status: 'draft',
    questions: src.questions.map((q) => ({ ...q, id: uid('q') })),
  });
}

/** Organizer-only: the responses to one form, newest first. */
export async function listResponses(db: Client, formId: string): Promise<FormResponse[]> {
  const rows = unwrap(
    await db
      .from('responses')
      .select('*')
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false })
  );
  return rows.map(toResponse);
}

/**
 * Files a student's submission and returns its reference id.
 *
 * The id is generated here rather than by the database because the submitter
 * can't read the row back — RLS gives response reads to the organizer alone —
 * and the confirmation screen shows them their own reference number.
 *
 * Anonymity isn't trusted to this call either: a trigger clears the name and
 * email on any response to a form marked anonymous.
 */
export async function addResponse(
  db: Client,
  input: {
    formId: string;
    respondentName: string | null;
    respondentEmail: string | null;
    answers: Record<string, AnswerValue>;
  }
): Promise<string> {
  const id = `r-${crypto.randomUUID()}`;
  const { error } = await db.from('responses').insert({
    id,
    form_id: input.formId,
    respondent_name: input.respondentName,
    respondent_email: input.respondentEmail,
    answers: input.answers,
  });
  if (error) throw new Error(error.message);
  return id;
}

export async function setResponseStatus(
  db: Client,
  id: string,
  status: ResponseStatus
): Promise<void> {
  const { error } = await db.from('responses').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteResponse(db: Client, id: string): Promise<void> {
  const { error } = await db.from('responses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export type { FormRow, FormSummary };
