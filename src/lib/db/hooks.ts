'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '@/components/auth-provider';
import { isDemoFormId } from '@/lib/demo';
import { isConvexConfigured } from './env';
import { useOrganizerActions } from './actions';
import type { FormSummary } from './schema';
import type { FormResponse } from '@/lib/types';

/**
 * Read hooks for the pages. Each is a live Convex query: when any write lands
 * (from this tab, another tab or a student's submission) the value updates
 * with no refetch. `refresh` stays on the return values as a no-op so pages
 * written for the polling version keep working.
 */

export { isConvexConfigured };

const noop = () => {};

export interface DashboardData {
  forms: FormSummary[];
  recent: FormResponse[];
  todayCount: number;
}

export function useDashboard() {
  const actions = useOrganizerActions();
  const { user, ready, configured } = useAuth();
  const live = ready && user ? {} : 'skip';
  // Midnight today, captured once per mount: a changing argument would
  // re-subscribe the query on every render.
  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const forms = useQuery(api.forms.listMine, live);
  const recent = useQuery(api.responses.listRecent, live);
  const todayCount = useQuery(api.responses.countSince, ready && user ? { since: startOfToday } : 'skip');

  const data = useMemo<DashboardData | null>(
    () =>
      forms !== undefined && recent !== undefined && todayCount !== undefined
        ? { forms, recent, todayCount }
        : null,
    [forms, recent, todayCount]
  );

  return {
    actions,
    user,
    data,
    error: null as string | null,
    configured,
    // Signed out counts as still loading: without it the page would render
    // its empty state ("No forms yet") to someone who simply isn't logged in.
    loading: !ready || !user || data === null,
    signedOut: ready && configured && !user,
    refresh: noop,
  };
}

export interface FormResults {
  form: FormSummary | null;
  responses: FormResponse[];
}

/** A single form and every response to it — the results page. */
export function useFormResults(id: string | undefined) {
  const actions = useOrganizerActions();
  const { user, ready, configured } = useAuth();
  const enabled = ready && user && id;

  const form = useQuery(api.forms.getOwned, enabled ? { id } : 'skip');
  // No form means nothing to fetch responses for, and the page renders its
  // "not found" panel.
  const responses = useQuery(api.responses.listForForm, enabled && form ? { formId: id } : 'skip');

  const data = useMemo<FormResults | null>(() => {
    if (form === undefined) return null;
    if (form === null) return { form: null, responses: [] };
    return responses === undefined ? null : { form, responses };
  }, [form, responses]);

  return {
    actions,
    user,
    data,
    error: null as string | null,
    configured,
    loading: !ready || !user || data === null,
    signedOut: ready && configured && !user,
    refresh: noop,
  };
}

/** The organizer's own form — what the builder and poster need in edit mode. */
export function useEditableForm(id: string | undefined) {
  const actions = useOrganizerActions();
  const { user, ready, configured } = useAuth();
  const form = useQuery(api.forms.getOwned, ready && user && id ? { id } : 'skip');

  // `undefined` means still loading; `null` means it isn't there. With no id
  // the caller is creating a form, so there is nothing to wait for — without
  // this the builder would sit on its skeleton forever.
  return {
    actions,
    user,
    form: id ? form : null,
    configured,
    loading: !ready || !user || (Boolean(id) && form === undefined),
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
 * The public pages read without a session — anyone may read a form — so these
 * deliberately don't wait on `useAuth`. A signed-out visitor is the normal
 * case here, not a state to redirect out of.
 */
export function useOpenForms() {
  const configured = isConvexConfigured();
  const forms = useQuery(api.forms.listOpen, configured ? {} : 'skip');
  return {
    forms: forms ?? [],
    error: null as string | null,
    configured,
    loading: configured && forms === undefined,
  };
}

/**
 * One form by id, with its response count. `null` means it isn't there. The
 * demo form lives in the client and must never reach Convex.
 */
export function usePublicForm(id: string | undefined) {
  const configured = isConvexConfigured();
  const form = useQuery(
    api.forms.get,
    configured && id && !isDemoFormId(id) ? { id } : 'skip'
  );
  return {
    form,
    error: null as string | null,
    configured,
    loading: Boolean(id) && configured && form === undefined,
  };
}
