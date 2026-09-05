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
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { HeroDemo } from '@/components/hero-demo';
import { buttonVariants } from '@/components/ui/button';
import { CATEGORY_LIST } from '@/lib/constants';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Templates for every desk',
    body: 'Ready-made forms for hostel complaints, mess polls, hackathon signups and course feedback — plus nine question types when you want to build it your way.',
  },
  {
    icon: Link2,
    title: 'One link, every group',
    body: 'Drop the link in the hostel group or pin it on the notice board. Students open, fill, submit — no account, no app.',
  },
  {
    icon: EyeOff,
    title: 'Anonymous where it matters',
    body: 'Mess and library feedback that students are honest in, because names and emails stay out of it.',
  },
  {
    icon: CalendarDays,
    title: 'Deadlines that close themselves',
    body: 'Registrations shut at midnight on the date you set. The warden can reopen a form with one click.',
  },
  {
    icon: BarChart3,
    title: 'Triage at a glance',
    body: 'Averages, splits and every individual response on one screen — the hostel office’s 9 AM review, already done.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Out to Excel in one click',
    body: 'Export the whole response sheet as CSV for the office printer, or for whoever still loves spreadsheets.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Pick a template',
    body: 'Hostel complaint, mess vote, hackathon signup — start from the form that already fits, edit the questions, set a deadline.',
  },
  {
    n: '02',
    title: 'Share the link',
    body: 'One URL works everywhere: hostel WhatsApp groups, classroom announcements, the department notice board.',
  },
  {
    n: '03',
    title: 'Watch responses land',
    body: 'Charts and averages update the moment a student hits submit. Export to CSV whenever the office asks.',
  },
];

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-ruled relative">
          {/* The margin rule every campus form sheet has, aligned to the
              content gutter rather than the viewport edge. */}
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-[72rem] max-w-full -translate-x-1/2 lg:block"
            aria-hidden
          >
            <span className="absolute inset-y-0 left-6 w-px bg-[var(--rule-margin)]" />
          </div>
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-28 lg:pt-20">
            <div className="animate-fade-up">
              <p className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-card px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/55">
                <span className="size-1.5 rounded-full bg-ballpoint-600" aria-hidden />
                Built for universities & hostels
              </p>
              <h1 className="mt-5 font-display text-[42px] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                Run your campus on forms people{' '}
                <span className="rounded-sm bg-marker px-1 text-ink [box-decoration-break:clone]">
                  actually finish
                </span>
                .
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/60">
                CampusForms replaces the Google Forms sprawl with one clean
                platform — hostel complaints reach the right desk, event
                signups fill themselves, and mess feedback stays anonymous.
                Share a link; students just fill it in.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard/new"
                  className={buttonVariants({ size: 'lg' })}
                >
                  Create your first form
                  <ArrowRight />
                </Link>
                <Link
                  href="/browse"
                  className={buttonVariants({ variant: 'secondary', size: 'lg' })}
                >
                  Browse open forms
                </Link>
              </div>
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40">
                No student sign-in · Anonymous mode · CSV export
              </p>
            </div>

            <div className="animate-fade-up [animation-delay:150ms] lg:pl-6">
              <HeroDemo />
            </div>
          </div>

          {/* Stat strip */}
          <div className="border-y border-ink/[0.07] bg-card/60">
            <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-ink/[0.07] px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
              {[
                { value: '12,480', label: 'responses collected' },
                { value: '214', label: 'forms run this semester' },
                { value: '9 AM', label: 'daily complaint triage' },
              ].map((s) => (
                <div key={s.label} className="flex items-baseline justify-center gap-3 py-5">
                  <span className="font-display text-2xl font-bold tracking-tight">{s.value}</span>
                  <span className="text-sm text-ink/50">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ballpoint-700">
            Five categories, one notice board
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Built for the forms your campus actually sends.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {CATEGORY_LIST.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.key}
                  href="/browse"
                  className="group rounded-2xl border border-ink/[0.08] bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <span className={cn('grid size-10 place-items-center rounded-xl', c.badge)}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold tracking-tight">
                    {c.label}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink/50">{c.examples}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-ink/[0.07] bg-card/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ballpoint-700">
              Why organizers switch
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you do in Google Forms, minus the clutter.
            </h2>
            <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="border-t-2 border-ink/10 pt-5">
                    <Icon className="size-5 text-ballpoint-600" aria-hidden />
                    <h3 className="mt-3 font-display text-[17px] font-bold tracking-tight">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink/55">{f.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ballpoint-700">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            From blank form to full dashboard in one sitting.
          </h2>
          <div className="relative mt-12 grid gap-10 lg:grid-cols-3">
            <div
              className="absolute left-0 right-0 top-5 hidden border-t-2 border-dotted border-ink/15 lg:block"
              aria-hidden
            />
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <span className="relative z-10 inline-grid size-10 place-items-center rounded-full bg-ballpoint-600 font-mono text-[13px] font-bold text-white shadow-sm">
                  {s.n}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/55">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="bg-ruled-ink relative overflow-hidden rounded-3xl bg-ink px-6 py-16 text-center sm:px-12 lg:py-20">
            <div className="animate-stamp absolute right-8 top-8 hidden rounded-lg border-[3px] border-tick/80 px-4 py-1.5 lg:block">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-tick">
                Free while in beta
              </p>
            </div>
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-paper sm:text-4xl">
              Your students are filling forms somewhere else.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-paper/60">
              Bring complaints, registrations and feedback home — your campus,
              your data, your rules.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard/new" className={buttonVariants({ size: 'lg' })}>
                Create your first form
                <ArrowRight />
              </Link>
              <Link
                href="/browse"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'lg',
                  className: 'text-paper/70 hover:bg-card/10 hover:text-paper',
                })}
              >
                Browse open forms
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
