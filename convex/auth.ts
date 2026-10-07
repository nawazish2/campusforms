import Google from '@auth/core/providers/google';
import { convexAuth } from '@convex-dev/auth/server';
import { assertAllowlisted } from './organizers';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      // Always show the account picker: students and staff routinely have a
      // personal account signed in too.
      authorization: { params: { prompt: 'select_account' } },
      // Only a Google-verified address counts. Without an email the allowlist
      // check below rejects the sign-in.
      profile(p) {
        return {
          id: p.sub,
          name: p.name,
          image: p.picture,
          email: p.email_verified ? p.email : undefined,
        };
      },
    }),
  ],
  callbacks: {
    // Runs inside the sign-in mutation after the user row is written; throwing
    // rolls the whole sign-in back, so an unlisted account gets no user and no
    // session. Convex Auth turns the throw into a redirect back to the login
    // page (see login/page.tsx), not an error message.
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      const user = await ctx.db.get(userId);
      await assertAllowlisted(ctx, user?.email);
    },
  },
});
