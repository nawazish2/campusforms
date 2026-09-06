import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track your response',
  description:
    'Enter the REF code from your submission to see where it sits in the organizer’s queue.',
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
