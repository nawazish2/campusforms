import type {
  AnswerValue,
  FormCategory,
  FormDefinition,
  FormResponse,
  FormStatus,
  Question,
  ResponseStatus,
} from '@/lib/types';

/** A row of `forms` exactly as Postgres stores it. */
// Type aliases, not interfaces: only an alias gets the implicit index
// signature that supabase-js's generics require of a row type.
export type FormRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: FormCategory;
  status: FormStatus;
  anonymous: boolean;
  deadline: string | null;
  questions: Question[];
  pinned: boolean;
  response_count: number;
  created_at: string;
};

/** A row of `responses`. */
export type ResponseRow = {
  id: string;
  form_id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  answers: Record<string, AnswerValue>;
  status: ResponseStatus;
  submitted_at: string;
};

/**
 * Hand-written rather than generated, so the table shapes stay reviewable in
 * the same place as the migration. Regenerate with the Supabase CLI later if
 * the schema grows past what's comfortable to maintain by hand.
 */
export type Database = {
  public: {
    Tables: {
      forms: {
        Row: FormRow;
        Insert: Omit<
          FormRow,
          'id' | 'created_at' | 'response_count' | 'pinned'
        > & {
          id?: string;
          response_count?: number;
          pinned?: boolean;
        };
        Update: Partial<Omit<FormRow, 'id' | 'owner_id' | 'created_at'>>;
        Relationships: [];
      };
      responses: {
        Row: ResponseRow;
        Insert: Omit<ResponseRow, 'submitted_at' | 'status'> & {
          status?: ResponseStatus;
          submitted_at?: string;
        };
        Update: Partial<Pick<ResponseRow, 'status'>>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      lookup_response_by_ref: {
        Args: { p_ref: string };
        Returns: {
          form_title: string;
          form_category: FormCategory;
          response_status: ResponseStatus;
          submitted_at: string;
          answers: Record<string, AnswerValue> | null;
          form_questions: Question[] | null;
          is_anonymous: boolean;
        }[];
      };
    };
    Enums: {
      form_category: FormCategory;
      form_status: FormStatus;
      response_status: ResponseStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};

/**
 * The UI speaks camelCase `FormDefinition`; the database speaks snake_case
 * rows. These two functions are the only place that difference exists.
 */
export function toForm(row: FormRow): FormDefinition {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    anonymous: row.anonymous,
    deadline: row.deadline,
    questions: row.questions,
    pinned: row.pinned,
    createdAt: row.created_at,
  };
}

/** A form plus its response count — what every list view needs. */
export type FormSummary = FormDefinition & { responseCount: number };

export function toSummary(row: FormRow): FormSummary {
  return { ...toForm(row), responseCount: row.response_count };
}

export function toResponse(row: ResponseRow): FormResponse {
  return {
    id: row.id,
    formId: row.form_id,
    respondentName: row.respondent_name,
    respondentEmail: row.respondent_email,
    submittedAt: row.submitted_at,
    answers: row.answers,
    status: row.status,
  };
}
