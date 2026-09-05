/**
 * Remembers which forms this browser has already submitted, so a refresh or a
 * second tap on the link doesn't quietly file a duplicate. It's a courtesy
 * marker, not enforcement — anyone can clear storage, and there is no account
 * to check against.
 */
const KEY = 'campusforms-submitted-v1';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    // Private browsing, disabled storage, corrupt value — the form still works.
    return [];
  }
}

export function hasSubmitted(formId: string): boolean {
  return read().includes(formId);
}

export function markSubmitted(formId: string): void {
  try {
    const ids = read();
    if (!ids.includes(formId)) localStorage.setItem(KEY, JSON.stringify([...ids, formId]));
  } catch {
    // Nothing to do — worst case the reminder doesn't appear next time.
  }
}

export function clearSubmitted(formId: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(read().filter((id) => id !== formId)));
  } catch {
    // Ignore.
  }
}
