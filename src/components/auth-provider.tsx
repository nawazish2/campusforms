'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import { isConvexConfigured } from '@/lib/db/env';

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

interface AuthState {
  user: AuthUser | null;
  /** False until the first session lookup finishes — don't redirect before it. */
  ready: boolean;
  /** False when the app has no Convex deployment URL yet. */
  configured: boolean;
  signInWithGoogle: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  ready: true,
  configured: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

/** Reads the Convex Auth session. Only mounted when a deployment is configured. */
function ConvexSession({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip');

  const value = useMemo<AuthState>(
    () => ({
      user: isAuthenticated ? (me ?? null) : null,
      // Authenticated but `me` still loading would flash the signed-out UI.
      ready: !isLoading && (!isAuthenticated || me !== undefined),
      configured: true,
      signInWithGoogle: async (next = '/dashboard') => {
        // Convex Auth sends a rejected account back to `redirectTo` with no
        // error, so the login page needs `via=google` to know a sign-in was
        // attempted and failed.
        await signIn('google', {
          redirectTo: `/login?next=${encodeURIComponent(next)}&via=google`,
        });
      },
      signOut: async () => {
        await signOut();
      },
    }),
    [isLoading, isAuthenticated, me, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // The env var is fixed at build time, so this branch never flips between renders.
  if (!isConvexConfigured()) return <>{children}</>;
  return <ConvexSession>{children}</ConvexSession>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
