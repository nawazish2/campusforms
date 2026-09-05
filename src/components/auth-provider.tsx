'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/db/client';

interface AuthState {
  user: User | null;
  /** False until the first session lookup finishes — don't redirect before it. */
  ready: boolean;
  /** False when the project has no Supabase keys yet. */
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  // One client for the life of the provider: a new one on every render would
  // drop the auth subscription below.
  const [supabase] = useState(() => (configured ? createClient() : null));
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });

    // Fires on sign-in, sign-out and token refresh, including in other tabs.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      ready,
      configured,
      signInWithGoogle: async (next = '/dashboard') => {
        if (!supabase) return;
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            // Ask Google for an account picker rather than silently reusing
            // whichever account the browser saw last — students and staff
            // routinely have a personal account signed in too.
            queryParams: { prompt: 'select_account' },
          },
        });
      },
      signOut: async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
    }),
    [supabase, session, ready, configured]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
