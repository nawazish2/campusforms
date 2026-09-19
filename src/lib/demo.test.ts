import { describe, expect, it } from 'vitest';
import { DEMO_FORM_ID, demoForm, isDemoFormId } from './demo';

describe('demoForm', () => {
  it('is a stable, open, anonymous mess form', () => {
    const a = demoForm();
    const b = demoForm();
    expect(a.id).toBe(DEMO_FORM_ID);
    expect(isDemoFormId(a.id)).toBe(true);
    expect(a.status).toBe('open');
    expect(a.anonymous).toBe(true);
    expect(a.category).toBe('mess');
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
    expect(a.questions.length).toBeGreaterThan(0);
  });
});
