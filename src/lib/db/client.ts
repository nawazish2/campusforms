'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './schema';
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';

/**
 * Browser client. It carries the anon key and the signed-in user's session,
 * so every query it makes is subject to the row level security policies in
 * `supabase/migrations` — that's where authorization actually lives.
 */
export { isSupabaseConfigured };

/**
 * `createBrowserClient` throws on empty credentials, which would take down
 * the whole route during prerender before any component could explain why.
 * These stand-ins let the page render its "not configured" state instead;
 * proxy.ts refuses to boot production without the real values.
 */
const PLACEHOLDER_URL = 'http://localhost:54321';
const PLACEHOLDER_KEY = 'supabase-not-configured';

export function createClient() {
  return createBrowserClient<Database>(
    SUPABASE_URL || PLACEHOLDER_URL,
    SUPABASE_KEY || PLACEHOLDER_KEY
  );
}
