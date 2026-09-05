'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { createClient, isSupabaseConfigured } from './client';
import * as api from './forms';
import type { FormSummary } from './schema';
import type { FormDefinition, FormResponse } from '@/lib/types';

/**
 * Read hooks for the organizer pages. They deliberately mirror what the
 * Zustand store used to hand back — a value plus a "still loading" flag — so
 * the pages keep their existing shape. Writes go straight to `./forms` and
 * then call `refresh`, rather than mutating any local cache: at a few hundred
 * rows a refetch is cheaper than keeping a cache honest.
 */

/** One Supabase client per component tree that asks for it. */
export function useDb() {
  return useMemo(() => createClient(), []);
}

export { isSupabaseConfigured };

/** Bumping this re-runs a hook's fetch. */
function useRefreshKey() {
  const [key, setKey] = useState(0);
  return [key, useCallback(() => setKey((k) => k + 1), [])] as const;
}

export interface DashboardData {
  forms: FormSummary[];
  recent: FormResponse[];
  todayCount: number;
}

export function useDashboard() {
  const db = useDb();
  const { user, ready, configured } = useAuth();
  const [key, refresh] = useRefreshKey();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let alive = true;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    (async () => {
      try {
        const [forms, recent, todayCount] = await Promise.all([
          api.listMyForms(db, user.id),
          api.listRecentResponses(db),
          api.countResponsesSince(db, startOfToday.toISOString()),
        ]);
        if (alive) {
          setData({ forms, recent, todayCount });
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Could not load your forms');
      }
    })();

    return () => {
      alive = false;
    };
  }, [db, user, ready, key]);

  return {
    db,
    user,
    data,
    error,
    configured,
    // Signed out counts as still loading: without it the page would render
    // its empty state ("No forms yet") to someone who simply isn't logged in.
    loading: !ready || !user || data === null,
    signedOut: ready && configured && !user,
    refresh,
  };
}

export interface FormResults {
  form: FormDefinition | null;
  responses: FormResponse[];
}

/** A single form and every response to it — the results page. */
export function useFormResults(id: string | undefined) {
  const db = useDb();
  const { user, ready, configured } = useAuth();
  const [key, refresh] = useRefreshKey();
  const [data, setData] = useState<FormResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user || !id) return;
    let alive = true;

    (async () => {
      try {
        const form = await api.getForm(db, id);
        // No form means nothing to fetch responses for, and the page renders
        // its "not found" panel.
        const responses = form ? await api.listResponses(db, id) : [];
        if (alive) {
          setData({ form, responses });
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Could not load this form');
      }
    })();

    return () => {
      alive = false;
    };
  }, [db, user, ready, id, key]);

  return {
    db,
    user,
    data,
    error,
    configured,
    loading: !ready || !user || data === null,
    signedOut: ready && configured && !user,
    refresh,
  };
}

/** Just the form definition — what the builder needs in edit mode. */
export function useEditableForm(id: string | undefined) {
  const db = useDb();
  const { user, ready, configured } = useAuth();
  const [form, setForm] = useState<FormDefinition | null | undefined>(undefined);

  useEffect(() => {
    if (!ready || !user || !id) return;
    let alive = true;
    (async () => {
      try {
        const found = await api.getForm(db, id);
        if (alive) setForm(found);
      } catch {
        if (alive) setForm(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [db, user, ready, id]);

  // `undefined` means still loading; `null` means it isn't there.
  return {
    db,
    user,
    form,
    configured,
    loading: !ready || !user || form === undefined,
    signedOut: ready && configured && !user,
  };
}

/** Sends a signed-out visitor to the login page, preserving where they were. */
export function useRequireAuth(signedOut: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (signedOut) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [signedOut, router, pathname]);
}

/**
 * The public pages read without a session — RLS lets anyone select a form —
 * so these deliberately don't wait on `useAuth`. A signed-out visitor is the
 * normal case here, not a state to redirect out of.
 */
export function useOpenForms() {
  const db = useDb();
  const configured = isSupabaseConfigured();
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let alive = true;
    (async () => {
      try {
        const rows = await api.listOpenForms(db);
        if (alive) setForms(rows);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Could not load the notice board');
      }
    })();
    return () => {
      alive = false;
    };
  }, [db, configured]);

  return {
    forms: forms ?? [],
    error,
    configured,
    loading: configured && forms === null && error === null,
  };
}

/** One form by id, with its response count. `null` means it isn't there. */
export function usePublicForm(id: string | undefined) {
  const db = useDb();
  const configured = isSupabaseConfigured();
  const [form, setForm] = useState<FormSummary | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !id) return;
    let alive = true;
    (async () => {
      try {
        const found = await api.getPublicForm(db, id);
        if (alive) setForm(found);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Could not load this form');
      }
    })();
    return () => {
      alive = false;
    };
  }, [db, configured, id]);

  return {
    db,
    form,
    error,
    configured,
    loading: configured && form === undefined && error === null,
  };
}
