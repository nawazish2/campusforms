import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from './schema';
import { SUPABASE_KEY, SUPABASE_URL } from './env';

/** Server client for route handlers, server actions and server components. */
export async function createClient() {
  const store = await cookies();
  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) store.set(name, value, options);
          } catch {
            // Called from a server component, where cookies are read-only.
            // Session refresh happens in proxy.ts instead.
          }
        },
      },
    }
  );
}
