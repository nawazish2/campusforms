/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import type { Id } from '../../convex/_generated/dataModel';
import type { Doc } from '../../convex/_generated/dataModel';

// Not a Convex function module: only the tests import it.
const modules = import.meta.glob('../../convex/**/*.ts');

export function newBackend() {
  return convexTest(schema, modules);
}
export type Backend = ReturnType<typeof newBackend>;

/** A user row plus a handle that calls functions as that user. */
export async function signedInAs(t: Backend, email = 'owner@example.test') {
  const userId = await t.run(async (ctx) => ctx.db.insert('users', { email, name: email }));
  return { userId, as: t.withIdentity({ subject: `${userId}|test-session` }) };
}

export type Question = Doc<'forms'>['questions'][number];
export const question = (
  id: string,
  type: Question['type'],
  extra: Partial<Question> = {}
): Question => ({ id, type, title: id, required: false, options: [], maxRating: 5, ...extra });

export async function insertForm(
  t: Backend,
  ownerId: Id<'users'>,
  extra: Partial<Doc<'forms'>> = {}
) {
  return t.run(async (ctx) =>
    ctx.db.insert('forms', {
      ownerId,
      title: 'Test form',
      description: '',
      category: 'general',
      status: 'open',
      anonymous: false,
      questions: [question('q1', 'short-text')],
      pinned: false,
      responseCount: 0,
      ...extra,
    })
  );
}

let counter = 0;
/** A fresh valid 16-hex ref. */
export function ref(): string {
  counter += 1;
  return counter.toString(16).padStart(16, '0');
}

export async function errorOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    const data = (e as { data?: unknown }).data;
    return typeof data === 'string' ? data : String((e as Error).message);
  }
  return 'did not throw';
}

/**
 * Stores a file the way an upload would. convex-test's mock records only size
 * and sha256, so the content type the real backend would keep is patched in.
 */
export async function storeFile(t: Backend, contentType: string, size = 10) {
  return t.run(async (ctx) => {
    const id = await ctx.storage.store(new Blob([new Uint8Array(size)], { type: contentType }));
    await ctx.db.patch(id as never, { contentType } as never);
    return id;
  });
}
