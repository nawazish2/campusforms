import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { fail, isValidEmail } from './rules';

const WINDOW_MS = 10 * 60 * 1000;
const WINDOW_LIMIT = 10;

/** Public: ask for organizer access. Nothing reads this table through the API. */
export const create = mutation({
  args: { email: v.string(), note: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const note = args.note.trim();
    if (!isValidEmail(email) || email.length > 200) fail('Enter a valid email address');
    if (note.length > 500) fail('That note is too long');

    const recent = await ctx.db
      .query('organizerRequests')
      .withIndex('by_creation_time', (q) => q.gt('_creationTime', Date.now() - WINDOW_MS))
      .take(WINDOW_LIMIT);
    if (recent.length >= WINDOW_LIMIT) {
      fail('Too many requests right now. Try again in a few minutes.');
    }

    const existing = await ctx.db
      .query('organizerRequests')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();
    if (existing !== null) fail('You’ve already asked — we’ll email you if a seat opens.');

    await ctx.db.insert('organizerRequests', { email, note });
  },
});
