'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { buttonVariants } from '@/components/ui/button';
import { avatarColor, cn, initials } from '@/lib/utils';

/** Who's signed in, and the way out. Hidden entirely until Supabase is set up. */
export function AccountMenu() {
  const router = useRouter();
  const { user, ready, configured, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!configured) return null;
  // Same footprint as the avatar, so the header doesn't shift when the
  // session resolves a round-trip later.
  if (!ready) return <div className="size-9 rounded-full bg-ink/[0.06]" aria-hidden />;

  if (!user) {
    return (
      <a href="/login" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
        <LogIn />
        <span className="hidden sm:inline">Sign in</span>
      </a>
    );
  }

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? '';

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account — ${name}`}
        className={cn(
          'grid size-9 place-items-center rounded-full text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-ballpoint-500/40',
          avatarColor(name)
        )}
      >
        {initials(name)}
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-pop absolute right-0 top-11 z-50 w-60 rounded-2xl border border-ink/10 bg-card p-1.5 shadow-lg"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-[13px] font-semibold">{name}</p>
            {user.email ? (
              <p className="truncate font-mono text-[11px] text-ink/45">{user.email}</p>
            ) : null}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push('/');
            }}
            className="flex w-full items-center gap-2 rounded-xl border-t border-ink/[0.07] px-3 py-2.5 text-left text-[13px] font-medium text-ink/70 transition hover:bg-ink/[0.04] hover:text-ink"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
