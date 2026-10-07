'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Command, EyeOff, LogIn, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/components/auth-provider';
import { buttonVariants } from '@/components/ui/button';
import { avatarColor, cn, initials } from '@/lib/utils';

const ITEM =
  'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink/70 transition hover:bg-ink/[0.05] hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-10 sm:text-[13px]';

/** Who's signed in, and the way out. Hidden entirely until Convex is set up. */
export function AccountMenu() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
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
  if (!ready) return <div className="size-10 rounded-full bg-ink/[0.06] sm:size-9" aria-hidden />;

  if (!user) {
    return (
      <a href="/login" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
        <LogIn />
        <span className="hidden sm:inline">Sign in</span>
      </a>
    );
  }

  const name = user.name ?? user.email ?? '';

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account — ${name}`}
        className={cn(
          'grid size-10 place-items-center rounded-full text-xs font-bold sm:size-9 outline-none transition focus-visible:ring-2 focus-visible:ring-ring',
          avatarColor(name)
        )}
      >
        {initials(name)}
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-pop absolute right-0 top-12 z-50 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-ink/10 bg-card p-1.5 shadow-lg sm:top-11 sm:w-60"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-[13px] font-semibold">{name}</p>
            {user.email ? (
              <p className="truncate font-mono text-[11px] text-ink/60">{user.email}</p>
            ) : null}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              window.dispatchEvent(new CustomEvent('cf:palette'));
            }}
            className={`${ITEM} border-t border-ink/10 md:hidden`}
          >
            <Command className="size-4" aria-hidden />
            Jump to…
          </button>
          <Link
            href="/browse"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`${ITEM} sm:hidden`}
          >
            <EyeOff className="size-4" aria-hidden />
            Student view
          </Link>
          <button type="button" role="menuitem" onClick={toggle} className={`${ITEM} sm:hidden`}>
            {theme === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
            {theme === 'dark' ? 'Light theme' : 'Dark theme'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push('/');
            }}
            className={`${ITEM} border-t border-ink/10`}
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
