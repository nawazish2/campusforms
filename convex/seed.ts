import { internalMutation } from './_generated/server';
import type { Doc } from './_generated/dataModel';

type Question = Doc<'forms'>['questions'][number];

const q = (
  id: string,
  type: Question['type'],
  title: string,
  extra: Partial<Question> = {}
): Question => ({ id, type, title, required: false, options: [], maxRating: 5, ...extra });

/**
 * Local sample data:  npx convex run seed:dev
 * Adds the project owner to the allowlist, a stand-in owner user, and two
 * open forms so /browse and /f/<id> have something to show. Safe to re-run.
 */
export const dev = internalMutation({
  args: {},
  handler: async (ctx) => {
    const email = 'knawazish153@gmail.com';
    const listed = await ctx.db
      .query('allowedOrganizers')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();
    if (!listed) await ctx.db.insert('allowedOrganizers', { email, note: 'Project owner' });

    const ownerEmail = 'seed-owner@example.test';
    let owner = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', ownerEmail))
      .first();
    if (!owner) {
      const id = await ctx.db.insert('users', { email: ownerEmail, name: 'Seed Owner' });
      owner = await ctx.db.get(id);
    }
    if (!owner) throw new Error('Could not create the seed owner');

    const existing = await ctx.db
      .query('forms')
      .withIndex('by_owner', (q) => q.eq('ownerId', owner._id))
      .first();
    if (existing) return { seeded: false };

    const base = { ownerId: owner._id, status: 'open' as const, pinned: false, responseCount: 0 };
    const mess = await ctx.db.insert('forms', {
      ...base,
      title: 'Mess feedback: this week',
      description: 'Tell us how the mess did. Anonymous: we never store your name.',
      category: 'mess',
      anonymous: true,
      pinned: true,
      questions: [
        q('qrating1', 'rating', 'How was the food overall?', { required: true }),
        q('qchoice1', 'single-choice', 'Which meal needs the most work?', {
          options: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'],
          required: true,
        }),
        q('qtext1', 'long-text', 'Anything else we should know?'),
      ],
    });
    const hostel = await ctx.db.insert('forms', {
      ...base,
      title: 'Hostel maintenance request',
      description: 'Report a fault in your room or corridor.',
      category: 'hostel',
      anonymous: false,
      questions: [
        q('qtext2', 'short-text', 'Room number', { required: true }),
        q('qdrop1', 'dropdown', 'What is broken?', {
          options: ['Plumbing', 'Electrical', 'Furniture', 'Internet', 'Other'],
          required: true,
        }),
        q('qemail1', 'email', 'Contact email', { required: true }),
      ],
    });
    return { seeded: true, mess, hostel };
  },
});
