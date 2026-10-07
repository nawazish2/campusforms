'use client';

import Link from 'next/link';
import { ArrowRight, EyeOff, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { CategoryBadge } from '@/components/category-badge';
import { NoticeSlip } from '@/components/ui/notice-slip';
import { buttonVariants } from '@/components/ui/button';
import { Stars } from '@/components/stars';

const EASE = [0.22, 1, 0.36, 1] as const;

function Entrance({
  i,
  className,
  children,
}: {
  i: number;
  className?: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.15 + i * 0.12 }}
    >
      <div className={reduce ? undefined : i % 2 ? 'animate-board-b' : 'animate-board-a'}>
        {children}
      </div>
    </motion.div>
  );
}

function Board() {
  return (
    <div className="relative mx-auto w-full max-w-md py-4 lg:max-w-lg">
      <Entrance i={0} className="relative z-[1] mr-6 sm:mr-10">
        <NoticeSlip tilt={-2.5} fastener="pin" className="p-5 pt-6">
          <div className="flex items-center justify-between gap-2">
            <CategoryBadge category="mess" />
            <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-ink/55">
              <EyeOff className="size-3" aria-hidden />
              Anonymous
            </span>
          </div>
          <h3 className="mt-3 font-display text-xl font-semibold leading-tight">
            Mess weekly feedback
          </h3>
          <div className="mt-3 flex items-center justify-between gap-3">
            <Stars value={4} />
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink/55">
              ~1 min
            </span>
          </div>
        </NoticeSlip>
      </Entrance>

      <Entrance i={1} className="relative z-[2] -mt-3 ml-6 sm:ml-12">
        <NoticeSlip tilt={1.8} fastener="tape" className="p-5 pt-7">
          <div className="flex items-center justify-between gap-2">
            <CategoryBadge category="hostel" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink/55">
              Room B-214
            </span>
          </div>
          <h3 className="mt-3 font-display text-xl font-semibold leading-tight">
            Fan not working
          </h3>
          <p className="mt-1.5 text-sm text-ink/65">
            Ceiling fan stopped last night. Regulator and switch both checked.
          </p>
        </NoticeSlip>
      </Entrance>

      <Entrance i={2} className="relative z-[3] -mt-3 mr-10 sm:mr-20">
        <NoticeSlip tilt={-1} fastener="pin" className="p-5 pt-6">
          <div className="flex items-center justify-between gap-2">
            <CategoryBadge category="event" />
            <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-ink/55">
              <Users className="size-3" aria-hidden />
              42 going
            </span>
          </div>
          <h3 className="mt-3 font-display text-xl font-semibold leading-tight">
            Hackathon RSVP
          </h3>
        </NoticeSlip>
      </Entrance>
    </div>
  );
}

export function HomeHero() {
  return (
    <section className="relative overflow-x-clip">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-12 lg:pt-10">
        <div className="animate-fade-up">
          <h1 className="max-w-[14ch] text-pretty font-display text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
            The forms students <span className="scribble">actually</span> finish.
          </h1>
          <p className="mt-6 max-w-[40ch] text-lg leading-relaxed text-ink/70">
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

        <Board />
      </div>
    </section>
  );
}
