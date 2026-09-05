import Link from 'next/link';
import { Logo } from '@/components/logo';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center px-4 py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto w-fit">
          <Logo />
        </div>
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/40">
          404 — page not found
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
          This page didn’t fill itself in.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/55">
          The page you’re looking for doesn’t exist. Check the notice board for
          open forms, or head to your dashboard.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/browse" className={buttonVariants()}>
            Browse forms
          </Link>
          <Link href="/dashboard" className={buttonVariants({ variant: 'secondary' })}>
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
