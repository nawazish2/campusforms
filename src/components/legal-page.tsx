import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

/**
 * Shared chrome for /privacy and /terms. Both are plain prose on the same
 * measure, so the only thing that varies is the heading and the body.
 */
export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 lg:py-16">
        <div className="animate-fade-up">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ballpoint-700">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
            {title}
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40">
            Last updated {updated}
          </p>
        </div>
        <div className="animate-fade-up mt-10 space-y-8 [animation-delay:80ms]">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold tracking-tight">{heading}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-ink/65">{children}</div>
    </section>
  );
}
