import { describe, expect, it } from 'vitest';
import { validateDraft, validateFill } from './validation';
import { blankForm, newQuestion } from './factories';
import type { FormDefinition, Question, QuestionType } from './types';

function form(questions: Question[], patch: Partial<FormDefinition> = {}): FormDefinition {
  return { ...blankForm(), anonymous: true, questions, ...patch };
}

function question(type: QuestionType, patch: Partial<Question> = {}): Question {
  return { ...newQuestion(type), title: 'Q', ...patch };
}

describe('validateFill', () => {
  it('requires a name unless the form is anonymous', () => {
    const named = form([], { anonymous: false });
    expect(validateFill(named, {}, { name: '  ', email: '' }).__respondent).toBeDefined();
    expect(validateFill(named, {}, { name: 'Aarav', email: '' })).toEqual({});
    expect(validateFill(form([]), {}, { name: '', email: '' })).toEqual({});
  });

  it('flags an empty required answer but leaves optional ones alone', () => {
    const required = question('short-text', { required: true });
    const optional = question('short-text');
    expect(validateFill(form([required]), {}, { name: '', email: '' })[required.id]).toBe(
      'This question is required.'
    );
    expect(validateFill(form([optional]), {}, { name: '', email: '' })).toEqual({});
  });

  it('treats an empty array as an unanswered multi-choice', () => {
    const q = question('multi-choice', { required: true });
    expect(validateFill(form([q]), { [q.id]: [] }, { name: '', email: '' })[q.id]).toBeDefined();
    expect(validateFill(form([q]), { [q.id]: ['Option 1'] }, { name: '', email: '' })).toEqual({});
  });

  it('rejects values that are not finite numbers', () => {
    const q = question('number');
    const check = (value: string) =>
      validateFill(form([q]), { [q.id]: value }, { name: '', email: '' })[q.id];
    expect(check('3')).toBeUndefined();
    expect(check('-2.5')).toBeUndefined();
    expect(check('abc')).toBe('Enter a number.');
    expect(check('Infinity')).toBe('Enter a number.');
    expect(check('1e999')).toBe('Enter a number.');
  });

  it('rejects malformed email answers', () => {
    const q = question('email');
    const check = (value: string) =>
      validateFill(form([q]), { [q.id]: value }, { name: '', email: '' })[q.id];
    expect(check('  student@univ.edu ')).toBeUndefined();
    expect(check('student@univ')).toBe('Enter a valid email address.');
  });
});

describe('validateDraft', () => {
  it('passes a form that is ready to publish', () => {
    expect(validateDraft(form([question('short-text')]))).toEqual([]);
  });

  it('names every untitled question', () => {
    const problems = validateDraft(
      form([question('short-text', { title: '' }), question('short-text'), question('short-text', { title: ' ' })])
    );
    expect(problems[0]).toContain('1 and 3');
  });

  it('rejects blank and duplicate options, ignoring case', () => {
    const blank = validateDraft(form([question('single-choice', { options: ['A', '  '] })]));
    expect(blank[0]).toContain('blank option');

    const dupe = validateDraft(form([question('dropdown', { options: ['Electrical', 'electrical'] })]));
    expect(dupe[0]).toContain('twice');
  });

  it('leaves non-choice questions' + " options alone", () => {
    expect(validateDraft(form([question('rating', { options: [] })]))).toEqual([]);
  });
});
