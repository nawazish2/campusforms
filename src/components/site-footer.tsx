import Link from 'next/link';
import { Logo } from '@/components/logo';

const productLinks = [
  { href: '/browse', label: 'Browse open forms' },
  { href: '/dashboard', label: 'Organizer dashboard' },
  { href: '/dashboard/new', label: 'Create a form' },
];

const categoryLinks = [
  { href: '/browse', label: 'Hostel complaints' },
  { href: '/browse', label: 'Mess feedback' },
  { href: '/browse', label: 'Event registrations' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/[0.07] bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/55">
              One link for every campus form — hostel complaints, event
              registrations and anonymous feedback. No sign-in for students, no
              spreadsheet wrangling for organizers.
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink/40">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              {productLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-ink/65 transition hover:text-ballpoint-700">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink/40">Popular uses</p>
            <ul className="mt-3 space-y-2 text-sm">
              {categoryLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-ink/65 transition hover:text-ballpoint-700">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-ink/[0.07] pt-6 text-[13px] text-ink/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 CampusForms — a Google Forms replacement, built for campus.</p>
          <div className="flex items-center gap-4 sm:ml-auto sm:mr-6">
            <Link href="/privacy" className="transition hover:text-ballpoint-700">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-ballpoint-700">
              Terms
            </Link>
          </div>
          <p>
            Crafted by <span className="font-medium text-ink/60">Nawazish</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
