import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
} from '@convex-dev/auth/nextjs/server';
import { CONVEX_URL } from '@/lib/db/env';

const isOrganizerRoute = createRouteMatcher(['/dashboard(.*)']);

/**
 * Convex Auth's job here is to finish the Google sign-in (it trades the
 * one-time `code` in the URL for session cookies) and to proxy auth actions
 * to Convex. On top of that, keep signed-out visitors out of the organizer
 * dashboard.
 */
const withConvexAuth = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isOrganizerRoute(request) && !(await convexAuth.isAuthenticated())) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = '';
    login.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
});

/**
 * Runs before every request. Named `proxy` in a `proxy.ts` file: Next 16
 * renamed the `middleware` convention, and the old name now warns on every boot.
 */
export async function proxy(request: NextRequest, event: NextFetchEvent) {
  // Without a deployment URL there is no session and the pages render their
  // "not connected" state. In production that's never valid — it would mean
  // nobody can sign in — so it fails loudly there.
  if (!CONVEX_URL) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_CONVEX_URL is required in production');
    }
    return NextResponse.next();
  }
  return withConvexAuth(request, event);
}

export const config = {
  // Everything except static assets. `/f/[id]` and `/browse` stay public.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|webp)$).*)'],
};
