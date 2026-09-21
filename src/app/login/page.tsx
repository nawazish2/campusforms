'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/components/auth-provider';
import { requestOrganizerAccess } from '@/lib/db/forms';
import { useDb } from '@/lib/db/hooks';
import { safeNextPath } from '@/lib/utils';

/** Google's mark. Lucide has no brand icons, and a generic key icon here reads as a password field. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

function isAllowlistError(error: string | null): boolean {
  if (!error) return false;
  const e = error.toLowerCase();
  return (
    e.includes('organizer list') ||
    e.includes('database error saving new user') ||
    e.includes('insufficient_privilege')
  );
}

function LoginCard() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const db = useDb();
  const { user, ready, configured, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [requesting, setRequesting] = useState(false);

  const next = safeNextPath(params.get('next'));
  const error = params.get('error');
  const blocked = isAllowlistError(error);

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-3xl border border-ink/10 bg-card p-8 shadow-md sm:p-10">
        <Logo />
        <h1 className="mt-7 font-display text-[28px] font-extrabold leading-tight tracking-tight">
          Sign in to run forms
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-ink/60">
          Organizers sign in with Google. Students don’t need an account.
          They just open the link you share.
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-warn-bd bg-warn-bg px-4 py-3"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn-tx" aria-hidden />
            <p className="text-[13px] leading-relaxed text-warn-tx">
              {error === 'missing_code'
                ? 'That sign-in link expired before it was used. Try again.'
                : error === 'access_denied'
                  ? 'Sign-in was cancelled.'
                  : blocked
                    ? 'This Google account isn’t on the organizer list. Request access below — students never need to sign in.'
                    : error}
            </p>
          </div>
        ) : null}

        {configured ? (
          <Button
            size="lg"
            variant="secondary"
            className="mt-7 w-full"
            disabled={busy || !ready}
            onClick={async () => {
              setBusy(true);
              try {
                await signInWithGoogle(next);
              } finally {
                setBusy(false);
              }
            }}
          >
            <GoogleMark />
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </Button>
        ) : (
          <div className="mt-7 rounded-xl border border-dashed border-ink/20 bg-paper px-4 py-4">
            <p className="text-[13px] font-semibold">Sign-in isn’t configured yet</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink/60">
              Add <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
              <code className="font-mono text-xs">.env.local</code>, then restart the dev
              server. See <code className="font-mono text-xs">supabase/README.md</code>.
            </p>
          </div>
        )}

        <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink/50">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Sign-in is limited to approved organizers. We store your name and
          email to label the forms you create.
        </p>

        <div className="mt-6 border-t border-ink/[0.06] pt-5">
          <button
            type="button"
            onClick={() => setRequestOpen((o) => !o)}
            className="text-[13px] font-medium text-ballpoint-700 underline decoration-ballpoint-300 underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40 rounded"
          >
            {blocked || requestOpen ? 'Request organizer access' : 'Need an organizer account?'}
          </button>
          {blocked || requestOpen ? (
            <form
              className="mt-3 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (requesting) return;
                setRequesting(true);
                try {
                  await requestOrganizerAccess(db, requestEmail, requestNote);
                  toast('Request sent. We’ll email you if a seat opens.');
                  setRequestEmail('');
                  setRequestNote('');
                  setRequestOpen(false);
                } catch (err) {
                  toast(err instanceof Error ? err.message : 'That didn’t send. Try again.', 'error');
                } finally {
                  setRequesting(false);
                }
              }}
            >
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="you@univ.edu"
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                aria-label="Email for organizer access"
              />
              <Textarea
                rows={3}
                maxLength={500}
                placeholder="Who you are and which desk you run — hostel office, mess committee, coding club…"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                aria-label="Why you need access"
              />
              <Button type="submit" size="sm" disabled={requesting || !configured}>
                {requesting ? 'Sending…' : 'Send request'}
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <Link
          href="/browse"
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <ArrowLeft />
          Browse open forms
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-paper px-4 py-12">
      <div className="w-full">
        <Suspense fallback={<div className="mx-auto h-[420px] w-full max-w-md animate-pulse rounded-3xl bg-card/70" />}>
          <LoginCard />
        </Suspense>
      </div>
    </main>
  );
}
