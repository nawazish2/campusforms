import { v } from 'convex/values';
import { internalMutation } from './_generated/server';

/**
 * Organizer allowlist. Internal, so only the dashboard or the CLI can call it:
 *   npx convex run admin:allowOrganizer '{"email":"warden@univ.edu"}'
 */
export const allowOrganizer = internalMutation({
  args: { email: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, { email, note }) => {
    const normalized = email.trim().toLowerCase();
    const existing = await ctx.db
      .query('allowedOrganizers')
      .withIndex('by_email', (q) => q.eq('email', normalized))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert('allowedOrganizers', { email: normalized, note });
  },
});

export const removeOrganizer = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const rows = await ctx.db
      .query('allowedOrganizers')
      .withIndex('by_email', (q) => q.eq('email', email.trim().toLowerCase()))
      .collect();
    for (const row of rows) await ctx.db.delete('allowedOrganizers', row._id);
  },
});
