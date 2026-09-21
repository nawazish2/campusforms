'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardList,
  EyeOff,
  FileSpreadsheet,
  Link2,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { StatsCounter } from '@/components/ui/stats-counter';
import { CATEGORIES, CATEGORY_ACCENT, QUESTION_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { FormCategory } from '@/lib/types';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Templates for every desk',
    body: 'Ready-made forms for hostel complaints, mess polls, hackathon signups and course feedback, plus nine question types when you want to build it your way.',
  },
  {
    icon: Link2,
    title: 'One link, every group',
    body: 'Drop the link in the hostel group or pin it on the notice board. Students open, fill, submit. No account, no app.',
  },
  {
    icon: EyeOff,
    title: 'Anonymous where it matters',
    body: 'Mess and library feedback that students are honest in, because names and emails stay out of it.',
  },
  {
    icon: CalendarDays,
    title: 'Deadlines that close the form',
    body: 'Set a date and the form stops accepting responses. The warden can reopen it with one click.',
  },
  {
    icon: BarChart3,
    title: 'Triage at a glance',
    body: 'Averages, splits and every individual response on one screen. The hostel office 9 AM review, already done.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Out to Excel in one click',
    body: 'Export the whole response sheet as CSV for the office printer, or for whoever still loves spreadsheets.',
  },
];

const FAQ = [
  {
    question: 'Do students need an account?',
    answer:
      'No. Organizers sign in with Google. Students open the link, fill the form, and submit.',
  },
  {
    question: 'How anonymous is anonymous?',
    answer:
      'On an anonymous form a Postgres trigger clears name and email as the row is written. There is no submitted-by column and no IP column.',
  },
  {
    question: 'Can I close a form after a deadline?',
    answer:
      'Set a date when you publish. The form stops accepting responses at that deadline. You can reopen it from the dashboard.',
  },
  {
    question: 'Where do responses go?',
    answer:
      'Straight into your organizer dashboard, with charts and a CSV export. Public REF lookup only shows queue status, never answers.',
  },
  {
    question: 'Who can create forms?',
    answer:
      'Only allowlisted organizers. Sign-in is Google, and the allowlist lives in the database.',
  },
];

const STEPS = [
  {
    title: 'Pick a template',
    body: 'Hostel complaint, mess vote, hackathon signup. Start from the form that already fits, edit the questions, set a deadline.',
  },
  {
    title: 'Share the link',
    body: 'One URL works everywhere: hostel WhatsApp groups, classroom announcements, the department notice board.',
  },
  {
    title: 'Watch responses land',
    body: 'Open results and the charts are waiting. Export to CSV whenever the office asks.',
  },
];

const CATEGORY_ORDER: FormCategory[] = [
  'hostel',
  'mess',
  'event',
  'academics',
  'general',
];

export function HomeStats() {
  return (
    <div className="border-y border-ink/[0.06]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-ink/[0.06] px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
        <div className="flex items-baseline gap-3 py-6 sm:justify-center">
          <span className="font-display text-2xl font-bold tracking-tight tabular-nums">
            <StatsCounter value={QUESTION_TYPES.length} />
          </span>
          <span className="text-sm leading-relaxed text-ink/65">question types</span>
        </div>
        <div className="flex items-baseline gap-3 py-6 sm:justify-center">
          <span className="font-display text-2xl font-bold tracking-tight tabular-nums">
            <StatsCounter value={0} />
          </span>
          <span className="text-sm leading-relaxed text-ink/65">accounts students need</span>
        </div>
        <div className="flex items-baseline gap-3 py-6 sm:justify-center">
          <span className="font-display text-2xl font-bold tracking-tight">CSV</span>
          <span className="text-sm leading-relaxed text-ink/65">export, any time</span>
        </div>
      </div>
    </div>
  );
}

export function HomeCategories() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
      <h2 className="max-w-2xl text-pretty font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Built for the forms your campus actually sends.
      </h2>
      <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-ink/70">
        Maintenance tickets, menu votes, fest signups, course surveys. Pick a
        category when you publish and it shows up on the notice board.
      </p>
      <ul className="mt-10 border-y border-ink/[0.06]">
        {CATEGORY_ORDER.map((key) => {
          const meta = CATEGORIES[key];
          const Icon = meta.icon;
          return (
            <li key={key} className="border-b border-ink/[0.06] last:border-b-0">
              <Link
                href="/browse"
                className="group flex min-h-16 items-center gap-4 py-4 outline-none transition hover:bg-ink/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ballpoint-500/40 sm:gap-6"
              >
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-xl',
                    CATEGORY_ACCENT[key].band
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-8">
                  <h3 className="font-display text-base font-bold tracking-tight sm:w-32 sm:shrink-0">
                    {meta.label}
                  </h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink/70 sm:mt-0">
                    {meta.examples}
                    {meta.anonymousDefault ? (
                      <span className="text-ink/45">, anonymous</span>
                    ) : null}
                  </p>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-ink/25 transition group-hover:translate-x-0.5 group-hover:text-ink/50"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HomeFeatures() {
  return (
    <section className="border-y border-ink/[0.06]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <h2 className="text-pretty font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Why organizers switch.
        </h2>
        <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-ink/70">
          Everything you do in Google Forms, minus the clutter, minus the
          spreadsheet nobody owns.
        </p>
        <ul className="mt-12 grid gap-x-16 gap-y-10 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title}>
                <span className="grid size-10 place-items-center rounded-xl bg-ballpoint-50 text-ballpoint-700">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-base font-bold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-ink/70">
                  {f.body}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function HomeAnonymity() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="text-pretty font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Anonymous means anonymous.
          </h2>
          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-ink/70">
            On an anonymous form, a database trigger clears names and emails as
            each row is written, not at display time. There is no submitted-by
            column, no IP column, nothing to leak or subpoena.
          </p>
          <Link
            href="/privacy"
            className="mt-6 inline-flex h-11 items-center gap-1.5 text-base font-semibold text-ballpoint-700 outline-none transition hover:text-ballpoint-600 focus-visible:ring-2 focus-visible:ring-ballpoint-500/40 dark:text-ballpoint-400"
          >
            How anonymity works
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card text-left">
          <pre className="overflow-x-auto p-6 font-mono text-sm leading-relaxed">
            <code>
              <span className="text-ink/45">BEFORE INSERT ON responses</span>
              {'\n'}
              <span className="text-ballpoint-600">IF</span>{' '}
              <span className="text-ink">form.anonymous</span>{' '}
              <span className="text-ballpoint-600">THEN</span>
              {'\n'}
              <span className="text-ink">  name := NULL; email := NULL;</span>
              {'\n'}
              <span className="text-ballpoint-600">END IF</span>
              <span className="text-ink/45">;</span>
            </code>
          </pre>
          <p className="border-t border-ink/[0.06] px-6 py-3 font-mono text-sm text-ink/50">
            Enforced by Postgres. The app never receives the names at all.
          </p>
        </div>
      </div>
    </section>
  );
}

export function HomeFolders() {
  return (
    <section className="border-y border-ink/[0.06]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <h2 className="max-w-2xl text-pretty font-display text-3xl font-bold tracking-tight sm:text-4xl">
          From blank form to full dashboard in one sitting.
        </h2>
        <div className="relative mt-12">
          <div
            className="pointer-events-none absolute top-5 right-[16%] left-[16%] z-0 hidden h-px bg-ink/10 sm:block"
            aria-hidden
          />
          <ol className="relative z-[1] grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="grid size-10 place-items-center rounded-full border border-ink/10 bg-paper font-display text-sm font-bold text-ballpoint-700">
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-base font-bold tracking-tight">
                {s.title}
              </h3>
              <p className="mt-1.5 max-w-[40ch] text-sm leading-relaxed text-ink/70">{s.body}</p>
            </li>
          ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function HomeFaq() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
      <h2 className="max-w-2xl text-pretty font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Questions organizers actually ask.
      </h2>
      <div className="mt-10 max-w-3xl">
        {FAQ.map((item) => (
          <details
            key={item.question}
            className="group border-b border-ink/[0.06] first:border-t"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-base font-semibold tracking-tight outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-ballpoint-500/40 [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full text-xl font-normal text-ink/40 transition group-open:rotate-45 group-open:text-ink"
                aria-hidden
              >
                +
              </span>
            </summary>
            <p className="max-w-prose pb-4 pr-12 text-sm leading-relaxed text-ink/70">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function HomeCta() {
  return (
    <section className="border-t border-ink/[0.06]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
        <h2 className="max-w-2xl text-pretty font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Your students are filling forms somewhere else.
        </h2>
        <p className="mt-4 max-w-[42ch] text-lg leading-relaxed text-ink/70">
          Bring complaints, registrations and feedback home. Your campus, your
          data, your rules.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/dashboard/new" className={buttonVariants({ size: 'lg' })}>
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
    </section>
  );
}
