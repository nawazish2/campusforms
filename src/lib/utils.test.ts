import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  answerToText,
  deadlineInfo,
  formShareText,
  initials,
  isFormAccepting,
  pluralize,
  safeNextPath,
  spotsLeft,
} from './utils';
import { newQuestion } from './factories';

afterEach(() => {
  vi.useRealTimers();
});

/** Freezes the clock at a local wall-clock time, whatever the host timezone. */
function freeze(local: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(local));
}

describe('deadlineInfo', () => {
  it('has nothing to say without a deadline', () => {
    expect(deadlineInfo(null)).toEqual({ expired: false, label: null });
  });

  it('keeps a date-only deadline open until the end of that day', () => {
    freeze('2026-09-25T23:58:00');
    const info = deadlineInfo('2026-09-25');
    expect(info.expired).toBe(false);
    expect(info.label).toBe('Closes today');
  });

  it('expires a date-only deadline after midnight', () => {
    freeze('2026-09-26T00:01:00');
    expect(deadlineInfo('2026-09-25').expired).toBe(true);
  });

  it('respects the time of day on a datetime deadline', () => {
    freeze('2026-09-25T17:00:00');
    const before = deadlineInfo('2026-09-25T18:00');
    expect(before.expired).toBe(false);
    expect(before.label).toContain('Closes today at');

    freeze('2026-09-25T19:00:00');
    expect(deadlineInfo('2026-09-25T18:00').expired).toBe(true);
  });

  it('labels a future deadline with its date', () => {
    freeze('2026-09-01T09:00:00');
    expect(deadlineInfo('2026-09-25').label).toBe('Closes Sep 25, 2026');
  });
});

describe('answerToText', () => {
  const rating = { ...newQuestion('rating'), maxRating: 5 };
  const text = newQuestion('short-text');
  const multi = newQuestion('multi-choice');

  it('renders an empty answer as an empty string', () => {
    expect(answerToText(undefined, text)).toBe('');
    expect(answerToText('', text)).toBe('');
  });

  it('renders a rating out of its own maximum', () => {
    expect(answerToText(4, rating)).toBe('4/5');
    expect(answerToText(4, { ...rating, maxRating: 10 })).toBe('4/10');
  });

  it('joins multi-choice answers', () => {
    expect(answerToText(['Water', 'Power'], multi)).toBe('Water; Power');
  });

  it('keeps a zero rating rather than dropping it', () => {
    // 0 is falsy but is a real answer once a student clears their rating.
    expect(answerToText(0, rating)).toBe('0/5');
  });

  it('does not leak a storage path for a photo', () => {
    expect(answerToText('fabc/ref/q1', newQuestion('file'))).toBe('Photo attached');
  });
});

describe('capacity', () => {
  it('treats a missing cap as unlimited', () => {
    expect(spotsLeft({ maxResponses: null, responseCount: 12 })).toBeNull();
    expect(
      isFormAccepting({ status: 'open', deadline: null, maxResponses: null, responseCount: 99 })
    ).toBe(true);
  });

  it('closes the form when the cap is reached', () => {
    expect(spotsLeft({ maxResponses: 30, responseCount: 29 })).toBe(1);
    expect(spotsLeft({ maxResponses: 30, responseCount: 30 })).toBe(0);
    expect(
      isFormAccepting({ status: 'open', deadline: null, maxResponses: 30, responseCount: 30 })
    ).toBe(false);
  });
});

describe('formShareText', () => {
  it('puts the title above the URL so WhatsApp previews the link', () => {
    expect(formShareText('Mess feedback', 'https://campusforms.vercel.app/f/demo')).toBe(
      'Mess feedback\nhttps://campusforms.vercel.app/f/demo'
    );
  });
});

describe('small formatters', () => {
  it('pluralizes on the count', () => {
    expect(pluralize(1, 'response')).toBe('1 response');
    expect(pluralize(0, 'response')).toBe('0 responses');
    expect(pluralize(1200, 'response')).toBe('1,200 responses');
  });

  it('takes at most two initials', () => {
    expect(initials('Aarav Sharma')).toBe('AS');
    expect(initials('  aarav  kumar sharma ')).toBe('AK');
    expect(initials(null)).toBe('?');
  });
});

describe('safeNextPath', () => {
  it('keeps same-site paths and rejects the rest', () => {
    expect(safeNextPath('/dashboard/form/abc')).toBe('/dashboard/form/abc');
    expect(safeNextPath('https://evil.example/phish')).toBe('/dashboard');
    expect(safeNextPath('//evil.example')).toBe('/dashboard');
    expect(safeNextPath(null, '/browse')).toBe('/browse');
  });
});
