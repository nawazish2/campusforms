import type { AnswerValue, FormDefinition } from './types';

/**
 * Draft autosave for the fill page. A student writing a long complaint
 * shouldn't lose it to a dropped connection or an accidental refresh, so
 * their answers land in localStorage as they type and get wiped only when
 * the submission actually goes through.
 */
const KEY = 'campusforms-drafts-v1';

export interface StoredDraft {
  values: Record<string, AnswerValue>;
  respondent: { name: string; email: string };
  savedAt: string;
}

function readAll(): Record<string, StoredDraft> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, StoredDraft>;
  } catch {
    // Private browsing, disabled storage, corrupt value — drafts are a
    // convenience, never a requirement.
    return {};
  }
}

export function loadDraft(formId: string): StoredDraft | null {
  const draft = readAll()[formId];
  if (!draft || typeof draft.savedAt !== 'string') return null;
  if (!draft.values || typeof draft.values !== 'object') return null;
  const respondent = draft.respondent ?? { name: '', email: '' };
  return {
    values: draft.values,
    respondent: {
      name: typeof respondent.name === 'string' ? respondent.name : '',
      email: typeof respondent.email === 'string' ? respondent.email : '',
    },
    savedAt: draft.savedAt,
  };
}

export function saveDraft(
  formId: string,
  draft: Omit<StoredDraft, 'savedAt'>
): void {
  try {
    const all = readAll();
    const empty =
      Object.keys(draft.values).length === 0 && !draft.respondent.name && !draft.respondent.email;
    if (empty) {
      delete all[formId];
    } else {
      all[formId] = { ...draft, savedAt: new Date().toISOString() };
    }
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Nothing to do — worst case the draft doesn't survive the refresh.
  }
}

/** Called once the write lands; a submitted form doesn't need its draft. */
export function clearDraft(formId: string): void {
  try {
    const all = readAll();
    delete all[formId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Ignore.
  }
}

/**
 * Single-slot autosave for the builder's create mode — an unpublished form
 * being assembled survives a closed tab. Edit mode doesn't use this: there
 * the database is the source of truth.
 */
const BUILDER_KEY = 'campusforms-builder-draft-v1';

export interface BuilderDraft {
  form: FormDefinition;
  savedAt: string;
}

export function loadBuilderDraft(): BuilderDraft | null {
  try {
    const raw = localStorage.getItem(BUILDER_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as BuilderDraft).savedAt === 'string' &&
      (parsed as BuilderDraft).form &&
      typeof (parsed as BuilderDraft).form === 'object'
    ) {
      return parsed as BuilderDraft;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveBuilderDraft(form: FormDefinition): void {
  try {
    localStorage.setItem(BUILDER_KEY, JSON.stringify({ form, savedAt: new Date().toISOString() }));
  } catch {
    // Ignore — worst case the tab-close guard is the only safety net.
  }
}

export function clearBuilderDraft(): void {
  try {
    localStorage.removeItem(BUILDER_KEY);
  } catch {
    // Ignore.
  }
}
