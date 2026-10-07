import type { FormDefinition } from '@/lib/types';

/**
 * A form plus its response count — what every list view needs. The Convex
 * queries in `convex/lib.ts` already return this shape (`_id` → `id`,
 * `_creationTime` → ISO `createdAt`), so there is no row mapper on this side.
 */
export type FormSummary = FormDefinition & { responseCount: number };

/** A summary without the count — what the builder edits and saves. */
export function toDefinition(summary: FormSummary): FormDefinition {
  const {
    id,
    title,
    description,
    category,
    status,
    anonymous,
    deadline,
    questions,
    pinned,
    maxResponses,
    createdAt,
  } = summary;
  return {
    id,
    title,
    description,
    category,
    status,
    anonymous,
    deadline,
    questions,
    pinned,
    maxResponses,
    createdAt,
  };
}
