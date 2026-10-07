'use client';

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/** Organizer-only: a URL for a photo stored against a response. */
export function PhotoAnswer({ responseId, questionId }: { responseId: string; questionId: string }) {
  const url = useQuery(api.responses.photoUrl, { responseId, questionId });

  if (!url) {
    return <span className="text-ink/60">Photo</span>;
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block w-fit max-w-full sm:max-w-xs">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Attached photo"
        className="max-h-56 rounded-lg border border-ink/10 object-contain"
      />
    </a>
  );
}
