import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AnswerValue, Question } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

function parseDate(iso: string): Date {
  // Date-only strings ("2026-09-15") are parsed as UTC by the spec;
  // anchor them to local midnight so day boundaries stay intuitive.
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

export function fmtDate(iso: string): string {
  return parseDate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function fmtDateTime(iso: string): string {
  const d = parseDate(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - parseDate(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  return fmtDate(iso);
}

/**
 * A deadline is either a date ("2026-09-25", which means end of that day) or
 * a date and time ("2026-09-25T18:00"). Forms saved before deadlines had a
 * time are the first kind, so both have to keep working.
 */
function isDateOnly(deadline: string): boolean {
  return deadline.length === 10;
}

/** "Sep 25, 2026" for a date-only deadline, "Sep 25 · 6:00 PM" with a time. */
export function fmtDeadline(deadline: string): string {
  return isDateOnly(deadline) ? fmtDate(deadline) : fmtDateTime(deadline);
}

export function deadlineInfo(deadline: string | null): {
  expired: boolean;
  label: string | null;
} {
  if (!deadline) return { expired: false, label: null };
  const end = parseDate(deadline);
  if (isDateOnly(deadline)) end.setHours(23, 59, 59, 999);
  const expired = end.getTime() < Date.now();
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  return {
    expired,
    label: expired
      ? `Deadline passed ${fmtDeadline(deadline)}`
      : daysLeft <= 1
        ? isDateOnly(deadline)
          ? 'Closes today'
          : `Closes today at ${parseDate(deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
        : `Closes ${fmtDeadline(deadline)}`,
  };
}

export function isFormAccepting(form: { status: string; deadline: string | null }): boolean {
  return form.status === 'open' && !deadlineInfo(form.deadline).expired;
}

const AVATAR_COLORS = [
  'bg-ballpoint-100 text-ballpoint-700',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-800',
  'bg-violet-100 text-violet-800',
  'bg-sky-100 text-sky-800',
  'bg-rose-100 text-rose-800',
];

export function avatarColor(name: string | null): string {
  if (!name) return 'bg-ink/[0.07] text-ink/50';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const out = parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  return out || '?';
}

/** Flattens any answer into a single line of text (CSV, tables, exports). */
export function answerToText(value: AnswerValue | undefined, question: Question): string {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value)) return value.join('; ');
  if (question.type === 'rating') return `${value}/${question.maxRating}`;
  return String(value);
}

export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? singular : plural}`;
}

/** Rough "time to fill" shown on cards and the fill page. */
export function estimateFillMinutes(questions: Question[]): number {
  const minutes = questions.reduce((sum, q) => {
    switch (q.type) {
      case 'long-text':
        return sum + 0.6;
      case 'rating':
        return sum + 0.15;
      case 'single-choice':
      case 'multi-choice':
      case 'dropdown':
        return sum + 0.25;
      default:
        return sum + 0.2;
    }
  }, 0.5);
  return Math.max(1, Math.round(minutes));
}
