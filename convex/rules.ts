import { ConvexError } from 'convex/values';

/**
 * The business rules for a submission, as plain functions so they can be read
 * and tested without a database. `responses.submit` is the only caller.
 *
 * Every failure is a ConvexError carrying the user-facing sentence as data.
 * A plain Error would be redacted to "Server Error" on a cloud deployment.
 */

export function fail(message: string): never {
  throw new ConvexError(message);
}

export const REF_PATTERN = /^[0-9a-f]{16}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export const MAX_ANSWERS_BYTES = 20000;
export const FLOOD_LIMIT = 30;
export const FLOOD_WINDOW_MS = 60_000;
/** Longest gap between UTC and any inhabited local time, plus a margin. */
const DEADLINE_GRACE_MS = 14 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/**
 * The instant a deadline string ends, read as UTC, or null if it is not one of
 * the two accepted shapes. '2026-09-25' ends with that day; '2026-09-25T18:00'
 * is a wall clock. Parsed by hand: `new Date('2026-09-25T18:00')` would use the
 * server's local zone.
 */
export function deadlineEnd(deadline: string): number | null {
  const dateOnly = DATE_ONLY.exec(deadline);
  const dateTime = DATE_TIME.exec(deadline);
  const m = dateOnly ?? dateTime;
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const [h, mi] = dateTime ? [Number(m[4]), Number(m[5])] : [0, 0];
  const ts = Date.UTC(y, mo - 1, d, h, mi);
  const back = new Date(ts);
  // Reject 2026-02-31 and 25:99, which Date.UTC silently rolls over.
  if (back.getUTCDate() !== d || back.getUTCHours() !== h || back.getUTCMinutes() !== mi) {
    return null;
  }
  return dateOnly ? ts + DAY_MS : ts;
}

/**
 * Neither shape carries a zone and the browser reads them in the visitor's.
 * So the server rejects only once the deadline has passed in *every* zone —
 * the app stays the precise gate and this is the backstop a script can't skip.
 * Being late here is fine; being early would reject real students.
 */
export function deadlinePassed(deadline: string, nowMs: number): boolean {
  const end = deadlineEnd(deadline);
  if (end === null) return false;
  return nowMs > end + DEADLINE_GRACE_MS;
}

type QuestionLike = {
  id: string;
  type: string;
  title: string;
  required: boolean;
  options: string[];
  maxRating: number;
};

function isBlank(a: unknown): boolean {
  return (
    a === undefined ||
    a === null ||
    (typeof a === 'string' && a.trim() === '') ||
    (Array.isArray(a) && a.length === 0)
  );
}

/** Size, keys, required and per-type rules. File answers get a string check here; storage is checked by the caller. */
export function checkAnswers(questions: QuestionLike[], answers: unknown): Record<string, unknown> {
  if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) {
    fail('Answers must be an object');
  }
  const obj = answers as Record<string, unknown>;

  if (new TextEncoder().encode(JSON.stringify(obj)).length > MAX_ANSWERS_BYTES) {
    fail('That response is too long');
  }

  const ids = new Set(questions.map((q) => q.id));
  for (const key of Object.keys(obj)) {
    if (!ids.has(key)) fail(`This form has no question ${key}`);
  }

  for (const q of questions) {
    const answer = obj[q.id];
    const label = q.title || 'untitled question';
    const blank = isBlank(answer);

    if (q.required && blank) fail(`Answer required: ${label}`);
    if (blank) continue;

    switch (q.type) {
      case 'rating': {
        let n: number;
        if (typeof answer === 'number') n = answer;
        else if (typeof answer === 'string' && /^\d+$/.test(answer)) n = Number(answer);
        else return fail(`Not a rating: ${label}`);
        if (!Number.isInteger(n) || n < 1 || n > (q.maxRating || 5)) {
          fail(`Rating out of range: ${label}`);
        }
        break;
      }
      case 'number':
        if (
          !(
            (typeof answer === 'number' && Number.isFinite(answer)) ||
            (typeof answer === 'string' && /^-?\d+(\.\d+)?$/.test(answer))
          )
        ) {
          fail(`Not a number: ${label}`);
        }
        break;
      case 'single-choice':
      case 'dropdown':
        if (typeof answer !== 'string' || !q.options.includes(answer)) {
          fail(`Not one of the options: ${label}`);
        }
        break;
      case 'multi-choice':
        if (
          !Array.isArray(answer) ||
          answer.some((a) => typeof a !== 'string' || !q.options.includes(a))
        ) {
          fail(`Not one of the options: ${label}`);
        }
        break;
      case 'email':
        if (typeof answer !== 'string' || !EMAIL_PATTERN.test(answer)) {
          fail(`Not an email address: ${label}`);
        }
        break;
      case 'date':
        if (typeof answer !== 'string' || !DATE_ONLY.test(answer)) {
          fail(`Not a date: ${label}`);
        }
        break;
      case 'file':
        if (typeof answer !== 'string') fail(`Not a photo: ${label}`);
        break;
      default:
        // short-text, long-text, and any type this code has not heard of.
        if (typeof answer !== 'string') fail(`Not text: ${label}`);
    }
  }
  return obj;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}
