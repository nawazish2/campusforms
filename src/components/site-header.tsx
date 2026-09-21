'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Browse', href: '/browse' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Status', href: '/status' },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/[0.06] bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ballpoint-500/40',
                  active
                    ? 'bg-ink/[0.06] text-ink'
                    : 'text-ink/70 hover:bg-ink/[0.04] hover:text-ink'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/browse"
            className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-ink/70 outline-none transition hover:bg-ink/[0.05] hover:text-ink focus-visible:ring-2 focus-visible:ring-ballpoint-500/40 md:hidden"
          >
            Browse
          </Link>
          <ThemeToggle />
          <Link
            href="/dashboard/new"
            aria-label="Create form"
            className={buttonVariants({ size: 'sm', className: 'ml-1' })}
          >
            <Plus />
            <span className="hidden sm:inline">Create form</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
