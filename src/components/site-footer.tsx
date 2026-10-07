import Link from 'next/link';
import { Logo } from '@/components/logo';
import { LineHoverLink } from '@/components/ui/line-hover-link';

const productLinks = [
  { href: '/browse', label: 'Browse open forms' },
  { href: '/status', label: 'Track a response' },
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
    <footer className="border-t border-dashed border-ink/20 bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink/60">
              One link for every campus form: hostel complaints, event
              registrations and anonymous feedback. No sign-in for students, no
              spreadsheet wrangling for organizers.
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60">Product</p>
            <ul className="mt-2 text-sm sm:mt-3 sm:space-y-2">
              {productLinks.map((l) => (
                <li key={l.label}>
                  <LineHoverLink href={l.href} variant="slide" className="inline-block py-2.5 text-ink/70 sm:py-0">
                    {l.label}
                  </LineHoverLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60">Popular uses</p>
            <ul className="mt-2 text-sm sm:mt-3 sm:space-y-2">
              {categoryLinks.map((l) => (
                <li key={l.label}>
                  <LineHoverLink href={l.href} variant="slide" className="inline-block py-2.5 text-ink/70 sm:py-0">
                    {l.label}
                  </LineHoverLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-dashed border-ink/20 pt-6 text-[13px] text-ink/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 CampusForms. A Google Forms replacement, built for campus.</p>
          <div className="flex items-center gap-5 sm:ml-auto sm:mr-6">
            <Link href="/privacy" className="inline-flex min-h-10 items-center transition hover:text-ballpoint-700">
              Privacy
            </Link>
            <Link href="/terms" className="inline-flex min-h-10 items-center transition hover:text-ballpoint-700">
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
