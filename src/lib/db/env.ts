/**
 * The Convex deployment URL, read in one place.
 *
 * Must stay a literal `process.env.NEXT_PUBLIC_…` lookup: Next.js substitutes
 * the value at build time by matching the text, so a computed key would come
 * back undefined in the browser.
 */
export const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? '';

export function isConvexConfigured(): boolean {
  return Boolean(CONVEX_URL);
}
