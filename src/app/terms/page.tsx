import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Terms of service',
  description:
    'The rules for using CampusForms as a student filling a form or as an organizer collecting responses.',
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of service" updated="6 September 2026">
      <Section heading="What this is">
        <p>
          CampusForms is a free tool for publishing campus forms — complaints,
          registrations, feedback — and collecting responses. It is run by an
          individual, not by a university, and it is not endorsed by any
          institution.
        </p>
      </Section>

      <Section heading="Filling a form">
        <p>
          You don’t need an account. Send accurate answers, don’t submit content
          that is unlawful, abusive, or someone else’s personal information, and
          don’t attempt to flood a form with automated submissions. The
          organizer who published the form decides what happens to what you
          send.
        </p>
      </Section>

      <Section heading="Running forms">
        <p>
          Organizer accounts are given out by invitation; sign-in is limited to
          an approved list. If you collect responses here, you are responsible
          for them: collect only what you need, tell people what it is for,
          don’t re-identify people who answered an anonymous form, and delete
          the form when you’re done with it.
        </p>
        <p>
          Accounts that collect data deceptively or misuse student responses
          will be removed from the list without notice.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          The service is provided as is, with no guarantee that it will be
          available or that data will survive. Keep your own copy of anything
          you can’t afford to lose. To the extent the law allows, we are not
          liable for loss arising from use of the service.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions, takedown requests and complaints:{' '}
          <a
            href="mailto:knawazish153@gmail.com"
            className="font-medium text-ballpoint-700 underline underline-offset-2"
          >
            knawazish153@gmail.com
          </a>
          . These terms are governed by the laws of India. Data handling is
          described in the{' '}
          <Link href="/privacy" className="font-medium text-ballpoint-700 underline underline-offset-2">
            privacy policy
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
