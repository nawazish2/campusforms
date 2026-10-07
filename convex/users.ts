import { getAuthUserId } from '@convex-dev/auth/server';
import { query } from './_generated/server';

/** The signed-in user, or null. What useAuth() is built on. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (user === null) return null;
    return { id: userId as string, email: user.email ?? null, name: user.name ?? null };
  },
});
