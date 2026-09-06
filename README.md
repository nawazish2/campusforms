# CampusForms

Forms for university life. An organizer signs in and publishes a form; students
open the link and fill it in. No student account, ever.

**[campusforms.vercel.app](https://campusforms.vercel.app)**

## Why it exists

The alternative on most campuses is a Google Form whose responses land in a
spreadsheet nobody owns, shared through a WhatsApp link that half the hostel
never sees. It works, barely, and it fails in the same three ways every time:
nobody can find the form, the mess feedback isn't really anonymous, and the
person who has to act on the results is reading raw rows.

CampusForms keeps the one-link workflow and fixes those three things — a public
notice board of open forms, anonymity enforced in the database rather than in
the interface, and a results view the hostel office can read in a morning.

## What it does

**For organizers.** Sign in with Google, build a form from nine question types,
or start from one of fourteen templates written for the job — Hostel
Maintenance Complaint, Weekly Mess Feedback, Event Registration, Weekend Leave
/ Night Pass. Publish, and you get a link plus a printable QR code for the
notice board. Results come back as averages, distributions and individual
responses, with CSV export for when you want a spreadsheet after all.

**For students.** Open the link and answer. No sign-in, no app, no account
recovery, nothing stored about who you are beyond what the form itself asks.
Every open form is also listed on `/browse`, so a form nobody forwarded to you
is still findable.

**Categories** — hostel, mess, events, academics, general — exist so the notice
board can be filtered by the thing a student is actually looking for.

## Anonymity that means something

Any form can be marked anonymous. When it is, a database trigger clears the
name and email as the row is written — not at display time, not in the query
that renders the organizer's screen. By the time the response exists, the
identifying fields are already null. The organizer never receives them, and
neither does anything downstream, including CSV export.

The schema supports that claim rather than working around it:

- **No `submitted_by` column and no IP column.** They were never added, so
  there is nothing to leak, subpoena or accidentally join against.
- **A student can't read their own response back.** The confirmation screen
  shows a reference number instead, generated client-side before the write.
- **Forms carry a trigger-maintained `response_count`,** which is how a public
  page can say "37 responses" while nobody but the organizer can read a single
  one.

Anonymity that only exists in the UI isn't anonymity. The limits of this claim
are stated below, and on `/privacy` for students.

## How it's built

Next.js 16 App Router with Turbopack, React 19, Tailwind v4, TypeScript, and
Supabase for auth, Postgres and row level security.

```
src/
  app/          routes — /, /browse, /f/[id], /login, /dashboard/*, /privacy, /terms
  components/   UI, including the form builder and the results summaries
  lib/
    db/         the only code that talks to Supabase
    validation  answer + draft rules, shared by the builder and the fill page
    analytics   response summaries
  proxy.ts      session refresh and the /dashboard guard
supabase/
  migrations/   schema, policies and triggers, in three ordered files
```

### Row level security is the whole authorization model

There is no ORM and no API layer. The browser talks to Postgres through
supabase-js, which means a policy here is not a second line of defence behind
some server that already checked — it is the only line. `src/lib/db/` is the
only place that issues a query, so the surface that has to be right stays small
enough to read in one sitting.

The policies are short enough to state in prose. Anyone may read any form, in
any status: `/f/[id]` needs closed and draft forms to exist in order to explain
why they aren't accepting responses, and nothing in a form definition is
confidential. Anyone may insert a response to an open form. Only the owner may
read, triage or delete responses, or touch the form itself.

### Rules that protect data live in the database

The publishable key is in the page source of every form. Anything enforced only
in the browser is therefore enforced nowhere — anyone willing to POST to the
REST endpoint directly skips it entirely, and that takes about a minute to
work out.

So the deadline, a per-form flood limit, and the shape of `answers` are all
triggers. `validateFill` still runs in the browser, but its job is to give a
student a good error message, not to keep bad rows out.

### Two schema choices that look odd and aren't

**`questions` and `answers` are `jsonb`.** Nothing ever queries a question on
its own — the builder rewrites the whole array per edit, and every summary
iterates it in JS. So a form saves as one upsert, and question ids, which
answers are keyed by, stay stable for free.

**`deadline` is `text`, not `timestamptz`.** It holds two shapes with different
meanings: `2026-09-25` is the end of that local day, `2026-09-25T18:00` is a
local wall clock. A timestamp column collapses that distinction, and neither
shape carries a timezone to convert from in the first place.

## Known limits

Named plainly, because the guarantees above are only worth something if you
know where they stop.

- **Anonymous means unnamed, not untraceable.** Submission time and row order
  still exist. On a form with very few responses, timing could narrow down who
  wrote something.
- **Answer *types* aren't validated server-side.** The write guard rejects
  unknown question ids, missing required answers and oversized payloads, but a
  rating could still arrive as a string.
- **The flood limit counts per form, not per submitter.** Responses carry no IP
  and no submitter id, on purpose, so there is nothing else to count. It stops
  a script; it wouldn't stop thirty phones.
- **Sign-in is allowlisted.** Organizer accounts are added by hand to
  `allowed_organizers`; there is no invitation flow yet.

---

Built by [Nawazish Khan](https://github.com/nawazish2).
