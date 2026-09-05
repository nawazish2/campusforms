import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Logo } from '@/components/logo';
import { buttonVariants } from '@/components/ui/button';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/[0.06] bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/browse"
            className="rounded-lg px-2.5 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.05] hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40 sm:px-3"
          >
            Browse
            <span className="hidden sm:inline"> forms</span>
          </Link>
          <Link
            href="/dashboard"
            className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/[0.05] hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40 sm:block sm:px-3"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/new"
            aria-label="Create form"
            className={buttonVariants({ size: 'sm', className: 'ml-1' })}
          >
            <Plus />
            <span className="hidden sm:inline">Create form</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
