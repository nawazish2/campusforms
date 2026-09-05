import type { FormCategory, FormDefinition, Question, QuestionType } from './types';
import { blankForm, newQuestion } from './factories';

interface TemplateQuestion {
  type: QuestionType;
  title: string;
  description?: string;
  required?: boolean;
  options?: string[];
  maxRating?: number;
}

export interface FormTemplate {
  id: string;
  category: FormCategory;
  /** Becomes the form title when the template is used. */
  title: string;
  /** One-liner on the picker card. */
  blurb: string;
  formDescription: string;
  anonymous: boolean;
  questions: TemplateQuestion[];
}

export const FORM_TEMPLATES: FormTemplate[] = [
  // ── Hostel ──────────────────────────────────────────────────────────────
  {
    id: 'hostel-maintenance',
    category: 'hostel',
    title: 'Hostel Maintenance Complaint',
    blurb: 'Broken fans, leaks, dead Wi-Fi — routed to the right desk with an urgency rating.',
    formDescription:
      'Report anything broken, leaking or unclean in your block. The hostel office triages these every morning at 9 AM.',
    anonymous: false,
    questions: [
      { type: 'short-text', title: 'Block and room number', description: 'e.g. Block C, Room 214', required: true },
      {
        type: 'single-choice',
        title: 'What is the issue about?',
        required: true,
        options: ['Electrical', 'Plumbing', 'Furniture', 'Housekeeping', 'Internet / Wi-Fi', 'Other'],
      },
      {
        type: 'rating',
        title: 'How urgent is this?',
        description: '1 = can wait a week, 5 = needs attention today',
        required: true,
        maxRating: 5,
      },
      { type: 'long-text', title: 'Describe the issue', description: 'Include when you first noticed it.', required: true },
      {
        type: 'dropdown',
        title: 'Preferred repair window',
        description: 'You will be in the room during this window.',
        options: ['Any time', 'Morning (8 AM – 12 PM)', 'Afternoon (12 – 4 PM)', 'Evening (4 – 8 PM)'],
      },
    ],
  },
  {
    id: 'hostel-roommate-change',
    category: 'hostel',
    title: 'Roommate Change Request',
    blurb: 'Collect change requests with reasons for the warden’s monthly review.',
    formDescription:
      'Requests are reviewed by the warden at the end of every month. You’ll be notified on your institute email.',
    anonymous: false,
    questions: [
      { type: 'short-text', title: 'Your current room number', required: true },
      { type: 'short-text', title: 'Requested room or roommate', required: true },
      { type: 'long-text', title: 'Reason for the request', required: true },
      {
        type: 'dropdown',
        title: 'Preferred warden meeting slot',
        options: ['Any slot', 'Monday 5 PM', 'Wednesday 5 PM', 'Friday 5 PM'],
      },
    ],
  },
  {
    id: 'hostel-night-pass',
    category: 'hostel',
    title: 'Weekend Leave / Night Pass',
    blurb: 'Date-bounded pass requests with guardian consent, ready for the assistant warden.',
    formDescription:
      'Apply at least 48 hours before departure. Passes are approved by the assistant warden and sent to your email.',
    anonymous: false,
    questions: [
      { type: 'short-text', title: 'Room number', required: true },
      { type: 'date', title: 'Going out — date', required: true },
      { type: 'date', title: 'Returning — date', required: true },
      {
        type: 'long-text',
        title: 'Destination and contact number',
        description: 'Where you’ll be staying, and a phone number you’ll answer.',
        required: true,
      },
      { type: 'single-choice', title: 'Guardian informed?', required: true, options: ['Yes', 'No'] },
    ],
  },

  // ── Mess ────────────────────────────────────────────────────────────────
  {
    id: 'mess-weekly-feedback',
    category: 'mess',
    title: 'Weekly Mess Feedback',
    blurb: 'The anonymous weekly pulse on food quality and hygiene, ready for the Sunday review.',
    formDescription:
      'Every rating is read in the Sunday review meeting with the mess contractor. Your name is never recorded.',
    anonymous: true,
    questions: [
      { type: 'rating', title: 'Food quality this week', required: true },
      {
        type: 'rating',
        title: 'Hygiene and cleanliness',
        description: 'Counters, tables, utensils and the kitchen area.',
        required: true,
      },
      {
        type: 'single-choice',
        title: 'Which meal needs the most improvement?',
        required: true,
        options: ['Breakfast', 'Lunch', 'Evening snacks', 'Dinner'],
      },
      { type: 'short-text', title: 'One dish you’d like more often' },
      { type: 'long-text', title: 'Suggestions for the mess committee' },
    ],
  },
  {
    id: 'mess-menu-vote',
    category: 'mess',
    title: 'Next Week’s Menu Vote',
    blurb: 'Let students pick the dishes — democracy for the kitchen.',
    formDescription:
      'Pick the dishes you want most; the top scorers make next week’s menu. One vote per student.',
    anonymous: true,
    questions: [
      {
        type: 'multi-choice',
        title: 'Pick up to four dishes',
        required: true,
        options: [
          'Paneer butter masala',
          'Rajma chawal',
          'Chole bhature',
          'Idli sambar',
          'Veg biryani',
          'Hakka noodles',
        ],
      },
      { type: 'rating', title: 'Value for money at the current rates', required: true },
      {
        type: 'long-text',
        title: 'Special instructions',
        description: 'Allergies, Jain food, less oil — tell the kitchen here.',
      },
    ],
  },
  {
    id: 'mess-hygiene-incident',
    category: 'mess',
    title: 'Food Hygiene Incident Report',
    blurb: 'Something tasted off? Log the meal and date for the audit trail.',
    formDescription:
      'Reports go directly to the chief warden and the mess committee chair. Reports are anonymous.',
    anonymous: true,
    questions: [
      { type: 'date', title: 'Date of the incident', required: true },
      {
        type: 'single-choice',
        title: 'Which meal?',
        required: true,
        options: ['Breakfast', 'Lunch', 'Evening snacks', 'Dinner'],
      },
      { type: 'long-text', title: 'What happened?', description: 'What you ate, what was wrong, how it tasted or smelled.', required: true },
      {
        type: 'rating',
        title: 'How severe was it?',
        description: '1 = fine afterwards, 5 = needed medical attention',
        required: true,
      },
    ],
  },

  // ── Event ───────────────────────────────────────────────────────────────
  {
    id: 'event-registration',
    category: 'event',
    title: 'Event Registration',
    blurb: 'A generic signup for talks, workshops and fests — tweak the details and ship it.',
    formDescription: 'Fill this once to reserve your spot. Seats are confirmed on your institute email.',
    anonymous: false,
    questions: [
      { type: 'short-text', title: 'Department and year', description: 'e.g. CSE, 2nd year', required: true },
      { type: 'single-choice', title: 'How are you participating?', required: true, options: ['Solo', 'With a team'] },
      { type: 'number', title: 'Team size (if participating as a team)' },
      {
        type: 'long-text',
        title: 'Anything the organizers should know?',
        description: 'Dietary needs, accessibility, equipment…',
      },
    ],
  },
  {
    id: 'event-hackathon',
    category: 'event',
    title: 'Hackathon Team Registration',
    blurb: 'Team name, size, track and accommodation — one form per team.',
    formDescription: '24-hour hackathon. Teams of 2–4 students; one form per team, filled by the team lead.',
    anonymous: false,
    questions: [
      { type: 'short-text', title: 'Team name', required: true },
      { type: 'number', title: 'Team size (2–4 students)', required: true },
      {
        type: 'single-choice',
        title: 'Track',
        required: true,
        options: ['AI & Machine Learning', 'Web & Mobile', 'IoT & Robotics', 'Open Innovation'],
      },
      { type: 'long-text', title: 'Team member emails', description: 'One email per line, including yours.', required: true },
      { type: 'single-choice', title: 'Need hostel accommodation during the event?', required: true, options: ['Yes', 'No'] },
    ],
  },
  {
    id: 'event-volunteers',
    category: 'event',
    title: 'Volunteer Signup',
    blurb: 'Crew preferences and prior experience for fest volunteering.',
    formDescription:
      'Volunteers get certificates and a crew T-shirt. Crew leads confirm over WhatsApp a week before the event.',
    anonymous: false,
    questions: [
      { type: 'short-text', title: 'Your branch and year', description: 'e.g. CSE, 2nd year', required: true },
      {
        type: 'multi-choice',
        title: 'Which crews would you like to join?',
        description: 'Pick as many as you like.',
        required: true,
        options: ['Registrations desk', 'Stage and sound', 'Decorations', 'Hospitality', 'Photography'],
      },
      { type: 'long-text', title: 'Any prior experience?', description: 'Optional — helps us assign crew leads.' },
    ],
  },

  // ── Academics ───────────────────────────────────────────────────────────
  {
    id: 'academics-course-feedback',
    category: 'academics',
    title: 'Course Feedback Survey',
    blurb: 'Anonymous mid-semester teaching feedback, before it’s too late to fix things.',
    formDescription:
      'Responses go to the HoD after grades are submitted — your identity is never revealed.',
    anonymous: true,
    questions: [
      { type: 'short-text', title: 'Course and instructor', description: 'e.g. CS201 — Dr. Rao', required: true },
      { type: 'rating', title: 'How clearly is the course taught?', required: true },
      {
        type: 'single-choice',
        title: 'How is the pace?',
        required: true,
        options: ['Too slow', 'Just right', 'Too fast'],
      },
      { type: 'rating', title: 'How heavy is the workload?', description: '1 = very light, 5 = overwhelming', required: true },
      { type: 'long-text', title: 'What would you change about this course?' },
    ],
  },
  {
    id: 'academics-facility-hours',
    category: 'academics',
    title: 'Library & Lab Hours Survey',
    blurb: 'Gauge demand before changing shared-facility timings.',
    formDescription: 'The committee reviews this survey before the next academic council meeting.',
    anonymous: true,
    questions: [
      {
        type: 'single-choice',
        title: 'Would extended evening hours help you?',
        required: true,
        options: ['Yes, a lot', 'A little', 'No, current hours are fine'],
      },
      { type: 'rating', title: 'How satisfied are you with current hours?', required: true },
      { type: 'long-text', title: 'What else should the committee know?' },
    ],
  },
  {
    id: 'academics-workshop-poll',
    category: 'academics',
    title: 'Workshop Topic Poll',
    blurb: 'Find out which skills students actually want a weekend workshop on.',
    formDescription: 'The top two topics get a weekend workshop with certification.',
    anonymous: false,
    questions: [
      {
        type: 'multi-choice',
        title: 'Which workshops would you attend?',
        description: 'Pick all that interest you.',
        required: true,
        options: ['Intro to Git & GitHub', 'React in a weekend', 'Python for data', 'Arduino basics', 'Public speaking'],
      },
      {
        type: 'single-choice',
        title: 'When can you attend?',
        required: true,
        options: ['Saturday morning', 'Saturday evening', 'Sunday morning', 'Sunday evening'],
      },
      { type: 'long-text', title: 'Anything else you’d like covered?' },
    ],
  },

  // ── General ─────────────────────────────────────────────────────────────
  {
    id: 'general-suggestion-box',
    category: 'general',
    title: 'Suggestion Box',
    blurb: 'A standing anonymous box for anything, from anyone, all semester.',
    formDescription: 'Reviewed by the student welfare board every Friday. Anonymous by design.',
    anonymous: true,
    questions: [
      {
        type: 'single-choice',
        title: 'What is this about?',
        required: true,
        options: ['Hostel', 'Mess', 'Academics', 'Sports', 'Something else'],
      },
      { type: 'long-text', title: 'Your suggestion', required: true },
      { type: 'rating', title: 'How important is this to you?', description: '1 = minor, 5 = affects daily life', required: true },
    ],
  },
  {
    id: 'general-club-signup',
    category: 'general',
    title: 'Club Membership Signup',
    blurb: 'Interest areas and motivation for club inductions.',
    formDescription: 'Clubs shortlist from these responses and email invites for trials and inductions.',
    anonymous: false,
    questions: [
      { type: 'short-text', title: 'Branch and year', description: 'e.g. CSE, 2nd year', required: true },
      {
        type: 'single-choice',
        title: 'Which club?',
        required: true,
        options: ['Coding club', 'Robotics', 'Music', 'Dance', 'Literary', 'Photography'],
      },
      { type: 'long-text', title: 'Why do you want to join?', required: true },
    ],
  },
];

export const TEMPLATES_BY_CATEGORY = (category: FormCategory) =>
  FORM_TEMPLATES.filter((t) => t.category === category);

/** Fills a fresh FormDefinition from a template — new ids every time. */
export function templateToForm(t: FormTemplate): FormDefinition {
  const questions: Question[] = t.questions.map((q) => {
    const base = newQuestion(q.type);
    return {
      ...base,
      title: q.title,
      description: q.description ?? '',
      required: q.required ?? false,
      options: q.options ?? base.options,
      maxRating: q.maxRating ?? base.maxRating,
    };
  });
  return {
    ...blankForm(),
    title: t.title,
    description: t.formDescription,
    category: t.category,
    anonymous: t.anonymous,
    questions,
  };
}
