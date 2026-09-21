import {
  AlignLeft,
  BedDouble,
  CalendarDays,
  ChevronDown,
  CircleDot,
  ClipboardList,
  GraduationCap,
  Hash,
  ListChecks,
  ImagePlus,
  Mail,
  PartyPopper,
  Star,
  Type,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { FormCategory, QuestionType } from './types';

export const CATEGORIES: Record<
  FormCategory,
  {
    label: string;
    icon: LucideIcon;
    badge: string;
    /** Full-color treatment for the landing page's category tiles. */
    tile: string;
    examples: string;
    /** Sensible anonymous default when starting a form in this category. */
    anonymousDefault: boolean;
  }
> = {
  hostel: {
    label: 'Hostel',
    icon: BedDouble,
    badge: 'bg-cath-soft text-cath-ink ring-cath-accent/25',
    tile: 'bg-cath-soft text-cath-ink hover:brightness-95',
    examples: 'Maintenance complaints, curfew feedback, room changes',
    anonymousDefault: false,
  },
  mess: {
    label: 'Mess',
    icon: UtensilsCrossed,
    badge: 'bg-catm-soft text-catm-ink ring-catm-accent/25',
    tile: 'bg-catm-soft text-catm-ink hover:brightness-95',
    examples: 'Weekly food feedback, menu votes, hygiene reports',
    anonymousDefault: true,
  },
  event: {
    label: 'Event',
    icon: PartyPopper,
    badge: 'bg-cate-soft text-cate-ink ring-cate-accent/25',
    tile: 'bg-cate-soft text-cate-ink hover:brightness-95',
    examples: 'Hackathons, fest registrations, volunteer signups',
    anonymousDefault: false,
  },
  academics: {
    label: 'Academics',
    icon: GraduationCap,
    badge: 'bg-cata-soft text-cata-ink ring-cata-accent/25',
    tile: 'bg-cata-soft text-cata-ink hover:brightness-95',
    examples: 'Course surveys, library hours, exam logistics',
    anonymousDefault: true,
  },
  general: {
    label: 'General',
    icon: ClipboardList,
    badge: 'bg-catg-soft text-catg-ink ring-catg-accent/25',
    tile: 'bg-catg-soft text-catg-ink hover:brightness-95',
    examples: 'Anything else your office needs to collect',
    anonymousDefault: false,
  },
};

/** Per-category accent used to theme the fill page and browse cards. */
export const CATEGORY_ACCENT: Record<
  FormCategory,
  { band: string; button: string; stripe: string }
> = {
  hostel: {
    band: 'bg-cath-soft text-cath-ink',
    button: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
    stripe: 'border-l-cath-accent',
  },
  mess: {
    band: 'bg-catm-soft text-catm-ink',
    button: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
    stripe: 'border-l-catm-accent',
  },
  event: {
    band: 'bg-cate-soft text-cate-ink',
    button: 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800',
    stripe: 'border-l-cate-accent',
  },
  academics: {
    band: 'bg-cata-soft text-cata-ink',
    button: 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800',
    stripe: 'border-l-cata-accent',
  },
  general: {
    band: 'bg-ink/[0.05] text-ink/70',
    button: 'bg-ink hover:bg-ink/90 active:bg-ink',
    stripe: 'border-l-catg-accent',
  },
};

export const CATEGORY_LIST = (
  Object.entries(CATEGORIES) as [FormCategory, (typeof CATEGORIES)[FormCategory]][]
).map(([key, meta]) => ({ key, ...meta }));

export const QUESTION_TYPES: {
  type: QuestionType;
  label: string;
  hint: string;
  icon: LucideIcon;
  hasOptions: boolean;
}[] = [
  { type: 'short-text', label: 'Short text', hint: 'One-line answer', icon: Type, hasOptions: false },
  { type: 'long-text', label: 'Long text', hint: 'Paragraph answer', icon: AlignLeft, hasOptions: false },
  { type: 'single-choice', label: 'Single choice', hint: 'Pick one option', icon: CircleDot, hasOptions: true },
  { type: 'multi-choice', label: 'Multi-select', hint: 'Pick any number', icon: ListChecks, hasOptions: true },
  { type: 'dropdown', label: 'Dropdown', hint: 'Pick from a list', icon: ChevronDown, hasOptions: true },
  { type: 'rating', label: 'Rating', hint: 'Star rating', icon: Star, hasOptions: false },
  { type: 'date', label: 'Date', hint: 'Pick a date', icon: CalendarDays, hasOptions: false },
  { type: 'number', label: 'Number', hint: 'Numeric answer', icon: Hash, hasOptions: false },
  { type: 'email', label: 'Email', hint: 'Email address', icon: Mail, hasOptions: false },
  { type: 'file', label: 'Photo', hint: 'A picture of the issue', icon: ImagePlus, hasOptions: false },
];

export const QUESTION_TYPE_MAP = Object.fromEntries(
  QUESTION_TYPES.map((t) => [t.type, t])
) as Record<QuestionType, (typeof QUESTION_TYPES)[number]>;

export const STATUS_META: Record<
  'draft' | 'open' | 'closed',
  { label: string; badge: string }
> = {
  draft: { label: 'Draft', badge: 'bg-ink/[0.06] text-ink/60 ring-ink/10' },
  open: {
    label: 'Open',
    badge: 'bg-tick-soft text-tick ring-tick/20',
  },
  closed: {
    label: 'Closed',
    badge: 'bg-correction-soft text-correction ring-correction/10',
  },
};

/** How a response's triage status is rendered everywhere it appears. */
export const RESPONSE_STATUS_META: Record<
  'new' | 'in-progress' | 'done',
  { label: string; chip: string }
> = {
  new: { label: 'New', chip: 'border-ballpoint-300 bg-ballpoint-50 text-ballpoint-800' },
  'in-progress': { label: 'In progress', chip: 'border-warn-bd bg-warn-bg text-warn-tx' },
  done: { label: 'Done', chip: 'border-tick/30 bg-tick-soft text-tick' },
};
