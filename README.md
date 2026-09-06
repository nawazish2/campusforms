# CampusForms

Forms for university life. An organizer signs in and publishes a form; students
open the link and fill it in. No student account, ever.

Live at **[campusforms.vercel.app](https://campusforms.vercel.app)**.

It exists because the alternative on most campuses is a Google Form whose
responses land in a spreadsheet nobody owns, shared through a WhatsApp link
that half the hostel never sees. CampusForms keeps the same one-link workflow
and adds the parts a campus actually needs: a public notice board of open
forms, anonymous feedback that is anonymous in the database rather than in the
interface, and a results view the hostel office can read in a morning.

## What it does

- **Organizers** sign in with Google, build a form from nine question types or
  a ready template, publish it, and get a link plus a printable QR code.
  Results arrive as averages, distributions and individual responses, with CSV
  export.
- **Students** open the link and answer. No sign-in, no app, nothing stored
  about who they are beyond what the form asks for.
- **Anonymous forms** have the name and email stripped by a database trigger as
  the row is written — not hidden at display time. The organizer never
  receives them. There is no IP column and no `submitted_by`.

## Running it locally

You need Node 20+ and a Supabase project. The whole backend is Supabase, so
there is no server of your own to run.

```bash
git clone https://github.com/nawazish2/campusforms.git
cd campusforms
npm install
```

### 1. Create a Supabase project

At [supabase.com/dashboard](https://supabase.com/dashboard). Pick a region near
your users — the hosted instance runs in Mumbai (`ap-south-1`).

### 2. Apply the schema

Open the project's SQL editor and run the three migrations in order, pasting
each file's contents and hitting Run:

| File | What it does |
|---|---|
| `supabase/migrations/0001_init.sql` | Tables, the anonymity and counter triggers, every RLS policy |
| `supabase/migrations/0002_restrict_organizers.sql` | Limits sign-in to an allowlist — **put your own email in it before running** |
| `supabase/migrations/0003_guard_responses.sql` | Enforces the deadline, a flood limit and the shape of `answers` on write |

`supabase/README.md` explains what each one decides and why.

### 3. Set up Google sign-in

Organizers authenticate with Google, so this is required even locally.

1. In the Google Cloud console, create an **OAuth client** of type *Web
   application*. Its authorized redirect URI is Supabase's callback —
   `https://<project-ref>.supabase.co/auth/v1/callback` — not your own app's.
2. In Supabase, **Authentication → Sign In / Providers → Google**: enable it
   and paste the client ID and secret.
3. In Supabase, **Authentication → URL Configuration**, add
   `http://localhost:3000/**` to the redirect allow-list. Leaving this empty is
   the usual reason a sign-in completes and drops you back at `/` with no
   session.

### 4. Point the app at your project

```bash
cp .env.local.example .env.local
```

Fill in the URL and publishable key from **Project Settings → API Keys**. The
publishable key is meant to be public — row level security is what protects the
data. Never put the secret (`service_role`) key in a `NEXT_PUBLIC_` variable;
it bypasses RLS entirely.

### 5. Run it

```bash
npm run dev
```

Then open [localhost:3000](http://localhost:3000) and sign in. A fresh database
has no forms, so `/browse` is empty until you publish one.

```bash
npm run build   # production build
npm run lint    # eslint
npm test        # vitest — 28 tests over validation, analytics and date handling
```

## How it's built

Next.js 16 App Router with Turbopack, React 19, Tailwind v4, and Supabase for
auth, Postgres and row level security. TypeScript throughout.

```
src/
  app/          routes — /, /browse, /f/[id], /login, /dashboard/*, /privacy, /terms
  components/   UI, including the form builder and the results summaries
  lib/
    db/         the only code that talks to Supabase
    validation  answer + draft rules, shared by the builder and the fill page
    analytics   response summaries
  proxy.ts      session refresh and the /dashboard guard
```

Two decisions worth knowing before you change anything:

**There is no ORM and no API layer.** The browser talks to Postgres through
supabase-js, and **row level security is the entire authorization model**. A
policy is not a second line of defence here; it is the only one. `src/lib/db/`
is the only place that queries, so that surface stays small enough to audit.

**Rules that protect data live in the database, not the app.** The publishable
key sits in the page source of every form, so anything enforced only in the
browser is enforced nowhere — anyone can POST to the REST endpoint directly.
That's why the deadline, the per-form flood limit and the shape of `answers`
are triggers rather than form validation. `validateFill` in the browser exists
to give a student a good error message, not to keep bad rows out.

In Supabase's **Data API** settings, leave *"Automatically expose new tables"*
on. The migrations contain no `grant` statements, so turning it off revokes
table privileges from `anon` and `authenticated` before RLS is ever consulted,
and every page breaks at once.

## Deploying

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in
your host **before** the first deploy. They are inlined at build time, and
`src/proxy.ts` throws when they're missing in production, so a deploy without
them returns 500 on every route rather than degrading. Then add your
production origin to Supabase's redirect allow-list.

## Known limits

Named honestly, because the security model above only works if you know where
it stops:

- **Answer types aren't validated server-side.** `0003` rejects unknown
  question ids, missing required answers and oversized payloads, but a rating
  could still arrive as a string.
- **The flood limit counts per form, not per submitter.** Responses carry no IP
  and no submitter id, on purpose, so there is nothing else to count. It stops
  a script; it wouldn't stop thirty phones.
- **Anonymous means unnamed, not untraceable.** Submission time and row order
  still exist. On a form with very few responses, timing could narrow down who
  wrote something. `/privacy` says so to students too.
