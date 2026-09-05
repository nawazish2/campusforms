import Link from 'next/link';
import { DatabaseZap } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { SiteHeader } from '@/components/site-header';
import { buttonVariants } from '@/components/ui/button';

/**
 * The organizer pages read and write Supabase, so without credentials there
 * is nothing to show. This says so plainly instead of rendering an empty
 * dashboard that looks like lost data.
 */
export function SetupRequired({ variant = 'organizer' }: { variant?: 'organizer' | 'public' }) {
  return (
    <div className="min-h-svh">
      {variant === 'public' ? <SiteHeader /> : <DashboardHeader />}
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-ink/[0.05]">
          <DatabaseZap className="size-7 text-ink/40" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
          The database isn’t connected yet
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">
          Add <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
          <code className="font-mono text-xs">.env.local</code>, run the migrations in{' '}
          <code className="font-mono text-xs">supabase/</code>, then restart the dev server.
        </p>
        <Link href="/browse" className={buttonVariants({ variant: 'secondary', className: 'mt-6' })}>
          Browse open forms
        </Link>
      </div>
    </div>
  );
}
