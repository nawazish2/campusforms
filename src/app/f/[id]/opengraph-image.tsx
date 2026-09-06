import { ImageResponse } from 'next/og';
import { getPublicForm } from '@/lib/db/forms';
import { createClient } from '@/lib/db/server';
import { CATEGORIES } from '@/lib/constants';
import type { FormCategory } from '@/lib/types';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'CampusForms form';

/** Band + chip colors per category, mirrored from CATEGORY_ACCENT. */
const BANDS: Record<FormCategory, string> = {
  hostel: '#fde68a',
  mess: '#a7f3d0',
  event: '#ddd6fe',
  academics: '#bae6fd',
  general: '#e2e8f0',
};
const BAND_TEXT: Record<FormCategory, string> = {
  hostel: '#78350f',
  mess: '#064e3b',
  event: '#4c1d95',
  academics: '#0c4a6e',
  general: '#334155',
};

export default async function Image(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const form = await getPublicForm(await createClient(), id).catch(() => null);

  const title = form?.title || 'Untitled form';
  const category = (form?.category ?? 'general') as FormCategory;
  const lines = wrap(title, 6).slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#f7f5ef',
          padding: 64,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Ruled paper */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 42,
                borderBottom: '1px solid rgba(24,27,37,0.06)',
                width: '100%',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: '#2f53de',
              color: '#ffffff',
              fontSize: 34,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: '#181b25', display: 'flex' }}>
            Campus<span style={{ color: '#2f53de', display: 'flex' }}>Forms</span>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              backgroundColor: BANDS[category],
              color: BAND_TEXT[category],
              fontSize: 26,
              fontWeight: 600,
              padding: '8px 24px',
              borderRadius: 999,
              display: 'flex',
            }}
          >
            {CATEGORIES[category].label} form
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: lines.length > 2 ? 72 : 88,
            fontWeight: 800,
            lineHeight: 1.12,
            color: '#181b25',
            maxWidth: 1020,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#181b25',
            opacity: 0.65,
            fontSize: 30,
          }}
        >
          <div style={{ display: 'flex' }}>
            {form ? `${form.responseCount} responses so far` : 'Open form'}
          </div>
          <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: 26 }}>
            Scan or tap to fill — no sign-in needed
          </div>
        </div>
      </div>
    ),
    size
  );
}

/** Rough title wrapping so long names don't overflow the canvas. */
function wrap(text: string, wordsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current: string[] = [];
  for (const w of words) {
    current.push(w);
    if (current.length >= wordsPerLine) {
      lines.push(current.join(' '));
      current = [];
    }
  }
  if (current.length) lines.push(current.join(' '));
  return lines;
}
