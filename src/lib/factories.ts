import { uid } from './utils';
import type { FormDefinition, Question, QuestionType } from './types';

export function newQuestion(type: QuestionType): Question {
  const isChoice =
    type === 'single-choice' || type === 'multi-choice' || type === 'dropdown';
  return {
    id: uid('q'),
    type,
    title: '',
    description: '',
    required: false,
    options: isChoice ? ['Option 1', 'Option 2', 'Option 3'] : [],
    maxRating: 5,
  };
}

export function blankForm(): FormDefinition {
  return {
    id: uid('f-'),
    title: '',
    description: '',
    category: 'general',
    status: 'draft',
    anonymous: false,
    deadline: null,
    questions: [],
    pinned: false,
    createdAt: new Date().toISOString(),
  };
}
