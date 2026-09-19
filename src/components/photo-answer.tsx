'use client';

import { useEffect, useState } from 'react';
import { useDb } from '@/lib/db/hooks';
import { signedPhotoUrl } from '@/lib/db/forms';

/** Organizer-only: a signed URL for a photo stored against a response. */
export function PhotoAnswer({ path }: { path: string }) {
  const db = useDb();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    signedPhotoUrl(db, path).then((signed) => {
      if (alive) setUrl(signed);
    });
    return () => {
      alive = false;
    };
  }, [db, path]);

  if (!url) {
    return <span className="text-ink/40">Photo</span>;
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block max-w-xs">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Attached photo"
        className="max-h-56 rounded-xl border border-ink/10 object-contain"
      />
    </a>
  );
}
