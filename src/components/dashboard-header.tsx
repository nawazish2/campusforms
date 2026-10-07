'use client';

import { Command, EyeOff, LayoutDashboard, Plus } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { AccountMenu } from '@/components/account-menu';
import { NotificationsBell } from '@/components/notifications-bell';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-dashed border-ink/20 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="hidden items-center gap-1.5 rounded-full border border-ink/10 bg-card px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-ink/60 sm:inline-flex">
            <LayoutDashboard className="size-3" />
            Organizer
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('cf:palette'))}
            aria-label="Open command palette"
            className="mr-1 hidden items-center gap-2 rounded-full border border-ink/15 bg-card px-3.5 py-1.5 text-[13px] text-ink/60 transition hover:border-ink/20 hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
          >
            <Command className="size-3.5" aria-hidden />
            Jump to…
            <kbd className="rounded border border-ink/10 bg-ink/[0.04] px-1 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
          <Link
            href="/browse"
            aria-label="Student view"
            title="Student view"
            className="hidden h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.05] hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex sm:px-3"
          >
            <EyeOff className="size-4" />
            <span className="hidden sm:inline">Student view</span>
          </Link>
          <Link
            href="/dashboard/new"
            aria-label="New form"
            className={buttonVariants({ size: 'sm' })}
          >
            <Plus />
            <span className="hidden sm:inline">New form</span>
          </Link>
          <ThemeToggle className="max-sm:hidden" />
          <NotificationsBell />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
