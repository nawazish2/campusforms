import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/db/env';

/**
 * Runs before every request. Two jobs: refresh the Supabase session cookie —
 * server components can't write cookies, so this is the only place it can
 * happen — and keep signed-out visitors out of the organizer dashboard.
 *
 * Named `proxy` in a `proxy.ts` file: Next 16 renamed the `middleware`
 * convention, and the old name now warns on every boot.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Without keys there is no session to refresh and the pages render their
  // "not connected" state. In production that's never a valid state — missing
  // keys would mean this middleware waves everyone through to the dashboard —
  // so it fails loudly there instead of depending on someone remembering.
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required in production'
      );
    }
    return response;
  }

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  // Everything except static assets. `/f/[id]` and `/browse` stay public.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|webp)$).*)'],
};
