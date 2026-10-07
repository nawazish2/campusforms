import type { MutationCtx } from './_generated/server';
import { fail } from './rules';

/**
 * Throws unless `email` is on the organizer allowlist. Called from the
 * sign-in callback in auth.ts; kept separate so tests can reach it.
 */
export async function assertAllowlisted(ctx: Pick<MutationCtx, 'db'>, email: unknown): Promise<void> {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const allowed =
    normalized === ''
      ? null
      : await ctx.db
          .query('allowedOrganizers')
          .withIndex('by_email', (q) => q.eq('email', normalized))
          .first();
  if (allowed === null) fail('This account is not on the organizer list');
}
