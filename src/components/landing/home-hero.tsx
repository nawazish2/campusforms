'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StaggerText } from '@/components/ui/staggerText';
import { HeroDemo } from '@/components/hero-demo';
import { buttonVariants } from '@/components/ui/button';

export function HomeHero() {
  return (
    <section className="relative">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:min-h-[calc(100dvh-4rem)] lg:gap-12 lg:pb-12 lg:pt-10">
        <div>
          <h1 className="max-w-[14ch] text-pretty font-display text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
            <StaggerText>The forms students actually finish.</StaggerText>
          </h1>
          <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-ink/70">
            One link for hostel complaints, event signups, and anonymous mess
            feedback. No student account.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/new"
              className={buttonVariants({ size: 'lg' })}
            >
              Create form
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/browse"
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
            >
              Browse open forms
            </Link>
          </div>
        </div>

        <div className="relative lg:pl-4">
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}
