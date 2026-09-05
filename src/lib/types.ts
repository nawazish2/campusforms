export type QuestionType =
  | 'short-text'
  | 'long-text'
  | 'single-choice'
  | 'multi-choice'
  | 'dropdown'
  | 'rating'
  | 'date'
  | 'number'
  | 'email';

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  /** Options for single-choice, multi-choice and dropdown questions. */
  options: string[];
  /** Star count for rating questions. */
  maxRating: number;
}

export type FormCategory = 'hostel' | 'mess' | 'event' | 'academics' | 'general';
export type FormStatus = 'draft' | 'open' | 'closed';

export interface FormDefinition {
  id: string;
  title: string;
  description: string;
  category: FormCategory;
  status: FormStatus;
  anonymous: boolean;
  /** "2026-09-15" (end of that day) or "2026-09-15T18:00". */
  deadline: string | null;
  questions: Question[];
  createdAt: string;
}

export type AnswerValue = string | string[] | number;

/** Where a response sits in the organizer's triage queue. */
export type ResponseStatus = 'new' | 'in-progress' | 'done';

export interface FormResponse {
  id: string;
  formId: string;
  respondentName: string | null;
  respondentEmail: string | null;
  submittedAt: string;
  answers: Record<string, AnswerValue>;
  /** Absent on responses saved before triage existed — treat as "new". */
  status?: ResponseStatus;
}
