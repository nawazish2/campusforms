import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/db/server';

/**
 * Where Google sends the organizer back. Trades the one-time code for a
 * session cookie, then continues to wherever they were headed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/dashboard';

  // Only same-site paths: an absolute URL here would make this an open
  // redirect for anyone who can craft the callback link.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';

  // Google and Supabase report their own failures here, with no code at all.
  // Passing the description through matters: "missing_code" would send
  // someone to retry a sign-in that is going to fail the same way every time.
  const providerError =
    searchParams.get('error_description') ?? searchParams.get('error');
  if (providerError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(providerError)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // The domain trigger rejects non-university accounts here, so this is the
    // path a personal Gmail account lands on.
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
