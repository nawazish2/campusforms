import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy policy · CampusForms',
  description:
    'What CampusForms collects when you fill a form or run one, how anonymous forms work, and how to get your data removed.',
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy policy" updated="6 September 2026">
      <Section heading="The short version">
        <p>
          Students don’t make an account. Filling a form stores your answers and
          the time you sent them — plus your name and email only if the form asks
          for them and isn’t marked anonymous. There is no tracking, no
          analytics, and no advertising anywhere on this site.
        </p>
      </Section>

      <Section heading="What we store, exactly">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="font-medium text-ink/80">If you fill a form:</strong>{' '}
            your answers, the form it belongs to, a reference number, and the
            submission time. Your name and email are stored only when the form
            collects them and is not anonymous.
          </li>
          <li>
            <strong className="font-medium text-ink/80">If you run forms:</strong>{' '}
            the name, email address and profile picture Google returns when you
            sign in, so your forms can be labelled as yours.
          </li>
        </ul>
        <p>
          We do not store IP addresses, device identifiers, or any link between a
          submission and the browser it came from. Those columns don’t exist in
          the database.
        </p>
      </Section>

      <Section heading="What “anonymous” means here">
        <p>
          When an organizer marks a form anonymous, the database strips the name
          and email off the submission as it is written — not when it is
          displayed. The organizer never receives them, and neither do we.
        </p>
        <p>
          One honest limit: the submission time and the order of submissions
          still exist. If very few people answer a form, that timing could narrow
          down who wrote something. Anonymous means unnamed, not untraceable.
        </p>
      </Section>

      <Section heading="Who can see your answers">
        <p>
          Only the organizer who created the form. Access is enforced by the
          database itself, not by the interface — a link to a form lets anyone
          read the questions and the response count, and nothing more. Other
          students, other organizers and anyone with the link cannot read
          submitted answers.
        </p>
      </Section>

      <Section heading="Where the data lives">
        <p>
          In a Supabase-hosted Postgres database in the Mumbai (ap-south-1)
          region, and on Vercel, which serves the site. Google handles organizer
          sign-in; we receive only your name, email and picture from it.
        </p>
      </Section>

      <Section heading="How long it’s kept">
        <p>
          Responses stay until the organizer deletes the form, which deletes
          every response to it. Nothing expires on its own. If you want a
          submission removed sooner, ask the organizer who published the form —
          the reference number on your confirmation screen is how they find it.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          Under India’s Digital Personal Data Protection Act, 2023, you can ask
          what we hold about you, ask for it to be corrected, ask for it to be
          erased, and complain about how it was handled. Write to{' '}
          <a
            href="mailto:knawazish153@gmail.com"
            className="font-medium text-ballpoint-700 underline underline-offset-2"
          >
            knawazish153@gmail.com
          </a>
          , which is also the grievance contact for this site. For an anonymous
          submission there is nothing tied to you to look up, so those requests
          go to the organizer instead.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If this policy changes, the date at the top changes with it. See also
          the <Link href="/terms" className="font-medium text-ballpoint-700 underline underline-offset-2">terms of service</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
