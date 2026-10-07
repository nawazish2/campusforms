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
notice board of open forms, anonymity enforced on the server rather than in
the interface, and a results view the hostel office can read in a morning.

## What it does

**For organizers.** Sign in with Google, build a form from ten question types,
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

Any form can be marked anonymous. When it is, the one function that writes a
response — `responses.submit` — stores `null` for the name and email. Not at
display time, not in the query that renders the organizer's screen: the
identifying fields are never written. The organizer never receives them, and
neither does anything downstream, including CSV export.

The schema supports that claim rather than working around it:

- **No `submittedBy` field and no IP field.** They were never added, so there
  is nothing to leak, subpoena or accidentally join against.
- **A student can't read their own response back.** The confirmation screen
  shows a reference number instead, generated client-side before the write.
  `/status` looks that code up and returns queue status only — never answers.
- **Forms carry a `responseCount`,** written only by submit and delete, which
  is how a public page can say "37 responses" while nobody but the organizer
  can read a single one.

Anonymity that only exists in the UI isn't anonymity. The limits of this claim
are stated below, and on `/privacy` for students.

## How it's built

Next.js 16 App Router with Turbopack, React 19, Tailwind v4, TypeScript, and
Convex for the database, functions, file storage and (through Convex Auth)
Google sign-in.

```
convex/         the backend: schema, functions, auth, the rules
  schema.ts     the data model — edit this to change it
  rules.ts      deadline, answer types, size: pure functions
  forms.ts, responses.ts, organizerRequests.ts, admin.ts, seed.ts, auth.ts
src/
  app/          routes — /, /browse, /f/[id], /login, /dashboard/*, /privacy, /terms
  components/   UI, including the form builder and the results summaries
  lib/
    db/         hooks (live queries) and actions (mutations) over Convex
    validation  answer + draft rules, shared by the builder and the fill page
    analytics   response summaries
  proxy.ts      finishes the Google sign-in and guards /dashboard
tests/convex/   the backend rules, run in-process with convex-test
```

### The functions are the whole authorization model

There is no ORM and no API layer of our own. The browser can only call Convex
functions, and every function checks who is asking: a public query takes no
identity, an owner function compares the signed-in user to the form's
`ownerId`. A rule here is not a second line of defence behind some server that
already checked — it is the only line. `convex/` is the only place that reads
or writes data, so the surface that has to be right stays small enough to read
in one sitting.

The rules are short enough to state in prose. Anyone may read any form, in any
status: `/f/[id]` needs closed and draft forms to exist in order to explain why
they aren't accepting responses, and nothing in a form definition is
confidential. Anyone may submit a response to an open form. Only the owner may
read, triage or delete responses, or touch the form itself.

### Rules that protect data live on the server

The deployment URL is in the page source of every form. Anything enforced only
in the browser is therefore enforced nowhere — anyone willing to call the
function directly skips it entirely, and that takes about a minute to work out.

So the deadline, a per-form flood limit, and the shape *and types* of
`answers` are all checked inside `responses.submit`. `validateFill` still runs
in the browser, but its job is to give a student a good error message, not to
keep bad rows out.

### Two schema choices that look odd and aren't

**`questions` is an array on the form and `answers` is an object on the
response.** Nothing ever queries a question on its own — the builder rewrites
the whole array per edit, and every summary iterates it in JS. So a form saves
as one write, and question ids, which answers are keyed by, stay stable for
free.

**`deadline` is a string, not a timestamp.** It holds two shapes with different
meanings: `2026-09-25` is the end of that local day, `2026-09-25T18:00` is a
local wall clock. A timestamp collapses that distinction, and neither shape
carries a timezone to convert from in the first place.

### Running it locally

```bash
npm install
npx convex dev     # first run creates a local deployment and writes .env.local
npm run dev        # in a second terminal
```

`npx convex dev` also watches `convex/`, pushes changes and keeps
`convex/_generated/` current. Without a Convex account it runs a local backend
(data in `.convex/`). Set the sign-in variables once on that deployment — see
`.env.local.example` for the full list:

```bash
npx convex env set SITE_URL http://localhost:3000
npx convex env set AUTH_GOOGLE_ID <client id>
npx convex env set AUTH_GOOGLE_SECRET <client secret>
# JWT_PRIVATE_KEY and JWKS: generate once, see "Manual Setup" in the Convex Auth docs
```

Sample data, so `/browse` has something on it:

```bash
npx convex run seed:dev
```

**Adding an organizer.** Sign-in is allowlisted, and the allowlist is only
writable from the CLI or the Convex dashboard:

```bash
npx convex run admin:allowOrganizer '{"email":"warden@univ.edu"}'
```

Requests from `/login` land in the `organizerRequests` table; read them with
`npx convex data organizerRequests`.

**Changing the schema.** Edit `convex/schema.ts`; `npx convex dev` pushes it.
An optional field (`v.optional(...)`) needs no migration — old documents simply
don't have it. A new required field needs a backfill first, so add it as
optional, backfill, then tighten it.

**Tests.** `npm test` runs the pure `src/lib` tests and the backend rules in
`tests/convex/` (anonymity, deadline, flood limit, every answer type,
ownership). They run against an in-memory Convex, no deployment needed.

## Roadmap

What's next, roughly in the order the campus would feel it.

- **Email digests** — a nightly "3 new complaints, 2 urgent" to organizers.
  Needs an email provider (e.g. Resend) and a scheduled Convex function;
  none of that exists yet.
- **AI assist** — draft a form from one sentence ("room change requests"),
  weekly "top themes from 214 responses" summaries, auto-triage of complaint
  urgency. Needs an LLM API key.
- **Live Sheets sync** — the CSV is a snapshot; some offices want the spreadsheet.
- **Cross-form insights** — "all hostel complaints this month" across forms,
  with the per-question summaries reused.
- **Playwright e2e** — create → share → submit → triage, run in CI.

## Known limits

Named plainly, because the guarantees above are only worth something if you
know where they stop.

- **Anonymous means unnamed, not untraceable.** Submission time and row order
  still exist. On a form with very few responses, timing could narrow down who
  wrote something. A photo can identify you even after EXIF is stripped.
- **The flood limit counts per form, not per submitter.** Responses carry no IP
  and no submitter id, on purpose, so there is nothing else to count. It stops
  a script; it wouldn't stop thirty phones.
- **Sign-in is allowlisted.** Organizer accounts are added by hand to
  `allowedOrganizers` (`admin:allowOrganizer`). Anyone can request access from
  `/login`; the inbox is the `organizerRequests` table, read from the CLI or
  the Convex dashboard, same as the allowlist. Removing someone from the
  allowlist stops new sign-ins; a session they already hold lasts until it
  expires.
- **A refused sign-in is a redirect, not a message.** Convex Auth sends an
  unlisted Google account back to `/login` without saying why, so the page
  explains the likely cause ("not on the organizer list, or cancelled").
- **Photos upload before the response is filed.** A student who uploads and then
  fails validation leaves an unattached file in storage until it is cleaned up.
- **Every page renders on request.** Convex Auth reads its session from
  cookies on the server, so no route is prerendered as static.

---

Built by [Nawazish Khan](https://github.com/nawazish2).
