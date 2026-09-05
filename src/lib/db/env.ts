/**
 * Supabase credentials, read in one place.
 *
 * Supabase renamed the browser key: new projects issue `sb_publishable_…`
 * and label it "publishable", while older ones issue an anon JWT. They are
 * interchangeable as far as supabase-js is concerned, so either variable
 * name works and whichever one is set wins.
 *
 * These must be written as literal `process.env.NEXT_PUBLIC_…` lookups —
 * Next.js substitutes the values at build time by matching the text, so a
 * computed key would come back undefined in the browser.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}
