import type { Metadata } from 'next';
import { getPublicForm } from '@/lib/db/forms';
import { createClient } from '@/lib/db/server';

/**
 * The client page can't export metadata, so the fill form's share card lives
 * here: a server layout that reads the public form and describes it for
 * WhatsApp/Slack link previews. The image itself comes from the sibling
 * opengraph-image.tsx.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const form = await getPublicForm(await createClient(), id).catch(() => null);
  if (!form) return { title: 'Form not found' };

  const description =
    form.description || `Fill in “${form.title}” on CampusForms — no sign-in needed.`;

  return {
    title: form.title,
    description,
    openGraph: {
      title: form.title,
      description,
    },
  };
}

export default function FillFormLayout({ children }: { children: React.ReactNode }) {
  return children;
}
