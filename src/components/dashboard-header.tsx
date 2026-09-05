import { EyeOff, LayoutDashboard, Plus } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { buttonVariants } from '@/components/ui/button';
import { AccountMenu } from '@/components/account-menu';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/[0.06] bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="hidden items-center gap-1.5 rounded-full border border-ink/10 bg-card px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-ink/50 sm:inline-flex">
            <LayoutDashboard className="size-3" />
            Organizer
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.05] hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40 sm:px-3"
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
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
