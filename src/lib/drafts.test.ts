import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, loadDraft, saveDraft } from './drafts';

// jsdom-free store shim: drafts only touch localStorage directly.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe('drafts', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips a draft with a savedAt stamp', () => {
    saveDraft('f-1', { values: { q1: 'Block B' }, respondent: { name: 'Aarav', email: '' } });
    const draft = loadDraft('f-1');
    expect(draft).not.toBeNull();
    expect(draft!.values).toEqual({ q1: 'Block B' });
    expect(draft!.respondent.name).toBe('Aarav');
    expect(new Date(draft!.savedAt).toString()).not.toBe('Invalid Date');
  });

  it('returns null when nothing was saved', () => {
    expect(loadDraft('f-missing')).toBeNull();
  });

  it('deletes an all-empty draft instead of storing it', () => {
    saveDraft('f-1', { values: {}, respondent: { name: '', email: '' } });
    expect(loadDraft('f-1')).toBeNull();
  });

  it('clearDraft wipes exactly one form', () => {
    saveDraft('f-1', { values: { q1: 'a' }, respondent: { name: '', email: '' } });
    saveDraft('f-2', { values: { q1: 'b' }, respondent: { name: '', email: '' } });
    clearDraft('f-1');
    expect(loadDraft('f-1')).toBeNull();
    expect(loadDraft('f-2')?.values.q1).toBe('b');
  });

  it('survives corrupt storage', () => {
    localStorage.setItem('campusforms-drafts-v1', '{not json');
    expect(loadDraft('f-1')).toBeNull();
    expect(() => saveDraft('f-1', { values: {}, respondent: { name: '', email: '' } })).not.toThrow();
  });
});
