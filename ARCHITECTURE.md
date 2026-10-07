# Architecture

How CampusForms is put together and why. For what the product does, see
[README.md](README.md). For the database setup, see
[supabase/README.md](supabase/README.md).

## System overview

```
                 ┌──────────────────────────────────────────────┐
  Organizer ───▶ │  Next.js 16 app (App Router, React 19)       │
  (Google SSO)   │                                              │
                 │  proxy.ts        session refresh, /dashboard │
  Student ─────▶ │                  guard                       │
  (no account)   │  server code     auth callback, OG metadata  │
                 │                  and share images            │
                 │  client pages    everything else             │
                 └───────────────┬──────────────────────────────┘
                                 │ supabase-js, publishable key
                                 │ + user session cookie (if any)
                 ┌───────────────▼──────────────────────────────┐
                 │  Supabase                                    │
                 │  Auth      Google OAuth, organizer allowlist │
                 │  Postgres  forms, responses, RLS, triggers   │
                 │  Storage   response-files bucket (photos)    │
                 └──────────────────────────────────────────────┘
```

There is no backend of our own: no API routes for data, no ORM, no service
role key. The browser queries Postgres directly through supabase-js, and
**row level security plus triggers are the entire authorization and
validation layer**. Anything enforced only in the browser is treated as
not enforced, because the publishable key is in every page's source.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (Turbopack), React 19, TypeScript |
| Styling | Tailwind v4, small hand-written UI kit in `src/components/ui/` |
| Animation | framer-motion |
| Data / auth / files | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Tests | Vitest (unit tests for `src/lib`) |
| Hosting | Vercel (production). A Cloudflare Workers build via vinext lives on the `cloudflare-workers` branch |

## Directory map

```
src/
  proxy.ts                 Next 16's renamed middleware
  app/
    page.tsx               landing
    browse/                public notice board of open forms
    f/[id]/                fill page (client) + server layout for metadata
                           + opengraph-image.tsx for link previews
    status/                look up a response by its REF code
    login/                 Google sign-in, organizer access requests
    auth/callback/route.ts OAuth code → session cookie
    dashboard/             organizer area (guarded by proxy.ts)
      new/                 create form (blank or from template)
      form/[id]/           results, triage, CSV export
      form/[id]/edit/      form builder
      form/[id]/poster/    printable QR poster
    privacy/, terms/       legal pages
  components/
    form-builder.tsx       editor for the questions array
    form-renderer.tsx      renders a form for filling
    question-summary.tsx   per-question result summaries
    auth-provider.tsx      React context holding the Supabase session
    ui/                    buttons, dialogs, inputs, etc.
    landing/               landing page sections
  lib/
    db/                    the only code that talks to Supabase
      env.ts               reads NEXT_PUBLIC_SUPABASE_* once
      client.ts            browser client
      server.ts            server client (cookies())
      schema.ts            hand-written Database type + row ↔ model mappers
      forms.ts             every query, RPC and storage call
      hooks.ts             React read hooks for pages
    types.ts               domain types (FormDefinition, Question, …)
    validation.ts          fill + builder validation (UX only)
    analytics.ts           response summaries
    csv.ts                 CSV export
    templates.ts           the 14 starter templates
    drafts.ts              localStorage drafts (builder and fill page)
    submissions.ts         localStorage "already submitted" marker
    photos.ts              client-side resize + EXIF strip before upload
    demo.ts                in-memory sample form for /browse and /f/demo
supabase/
  migrations/              schema, RLS, triggers, RPCs, storage policies
```

## Rendering model

Almost every page is a client component (`'use client'`). Data is fetched in
the browser through hooks in `src/lib/db/hooks.ts`, using the signed-in
user's session, so RLS sees the real user.

Server code is limited to three places:

1. **`src/proxy.ts`** runs on every non-static request. It refreshes the
   Supabase session cookie (server components can't write cookies) and
   redirects signed-out visitors from `/dashboard/*` to `/login?next=…`. In
   production it throws if Supabase env vars are missing, so a bad deploy
   can't leave the dashboard unguarded.
2. **`src/app/auth/callback/route.ts`** exchanges the OAuth code for a
   session. `next` is passed through `safeNextPath` to prevent open
   redirects. The organizer allowlist rejects unknown accounts at this step.
3. **`src/app/f/[id]/layout.tsx` and `opengraph-image.tsx`** read the public
   form on the server to produce titles and share cards for WhatsApp/Slack
   previews.

Writes never go through the server. Pages call functions in
`src/lib/db/forms.ts` and then call the hook's `refresh()` to refetch. There
is no client cache; at a few hundred rows a refetch is cheaper than keeping a
cache correct.

## Data layer

### Boundary rule

`src/lib/db/` is the only directory that imports Supabase. Pages and
components get a client from `useDb()` and pass it to functions in
`forms.ts`. This keeps every query in one file that can be reviewed against
the RLS policies.

`schema.ts` is the single place where snake_case rows become camelCase
domain objects (`toForm`, `toSummary`, `toResponse`). The `Database` type is
hand-written next to the migrations rather than generated.

### Tables

| Table | Purpose | Key columns |
|---|---|---|
| `forms` | One row per form | `owner_id`, `status` (`draft`/`open`/`closed`), `category`, `anonymous`, `deadline` (text), `questions` (jsonb), `pinned`, `max_responses`, `response_count` |
| `responses` | One row per submission | `form_id`, `ref` (16-hex, unique), `respondent_name`, `respondent_email`, `answers` (jsonb, keyed by question id), `status` (`new`/`in-progress`/`done`), `public_note` |
| `allowed_organizers` | Emails allowed to sign up | read from SQL editor only |
| `organizer_requests` | Access requests from `/login` | insert-only for the public |

Storage: the `response-files` bucket holds photo answers at
`{form_id}/{ref}/{question_id}`.

### Why `questions` and `answers` are jsonb

Nothing queries a single question. The builder rewrites the whole array on
each save and every summary iterates it in JS, so a form saves as one upsert
and question ids stay stable.

### Why `deadline` is text

It stores two different things: `2026-09-25` (end of that local day) and
`2026-09-25T18:00` (a local wall-clock time). Neither has a timezone. A
`timestamptz` would lose the difference.

## Authorization (RLS)

| Action | Who |
|---|---|
| Read any form, any status | Anyone (closed/draft forms must render an explanation) |
| Create / update / delete a form | Its owner |
| Insert a response | Anyone, if the form is open |
| Read / delete a response | The form's owner |
| Update a response | The form's owner, and only `status` / `public_note` |
| Upload a photo | Anyone, to an open form, at a well-formed path |
| Read / delete a photo | The form's owner (via signed URLs) |
| Look up a response by REF | Anyone, via `lookup_response_by_ref` RPC — returns status, form title and public note, never answers |
| Sign up as organizer | Only emails in `allowed_organizers` (trigger on `auth.users`) |

## Database triggers

Rules that protect data live in Postgres so a direct REST call can't skip
them. `validation.ts` repeats some of them in the browser only to show good
error messages.

| Trigger | Does |
|---|---|
| `responses_strip_identity` | Nulls `respondent_name` and `respondent_email` when the form is anonymous |
| `responses_count_ins` / `_del` | Maintains `forms.response_count` so public pages can show counts without reading responses |
| `responses_guard` | Rejects late submissions (deadline, with a timezone grace window), more than 30 per form per minute, payloads over 20 KB, unknown question ids, missing required answers, over-capacity forms |
| answer type validation | Ratings in range, choices from the options, email/date shapes |
| `responses_update_status_only` | Owners can change triage fields, not answers |
| `forms_protect_invariants` | `response_count` is immutable from clients; `anonymous` is locked after the first response |
| `enforce_organizer_allowlist_on_signup` | Blocks sign-up for emails not in `allowed_organizers` |
| `organizer_requests_guard` | Normalizes and validates the email, caps the note at 500 chars, allows at most 10 requests per 10 minutes overall |

## Key flows

### Student submits a response

```
/f/[id] (client)
  ├─ usePublicForm(id)          read form (public policy)
  ├─ validateFill()             browser-side errors only
  ├─ ref = newResponseRef()     16 hex chars, crypto.getRandomValues
  ├─ for each photo answer:
  │    preparePhoto()           resize to 1600px, re-encode (drops EXIF)
  │    uploadResponsePhoto()    response-files/{form}/{ref}/{question}
  ├─ addResponse({ ..., ref })  INSERT into responses
  │    └─ DB: guard → type check → strip identity → count++
  ├─ markSubmitted(formId)      localStorage hint, not enforcement
  └─ show REF on success screen
```

The response `id` and `ref` are generated in the browser because the
student cannot `SELECT` their own row. On a unique-`ref` collision the insert
retries once with a new ref (unless photos were already uploaded under it).

### Student checks status

`/status` → `lookup_response_by_ref(ref)` (security-definer RPC) → form
title, triage status, submission time, organizer's public note. No answers.

### Organizer signs in

```
/login → supabase.auth.signInWithOAuth(google)
       → Google → /auth/callback?code=…
       → exchangeCodeForSession (allowlist trigger may reject)
       → redirect to safeNextPath(next)
```

`AuthProvider` subscribes to auth changes on the client; `proxy.ts` keeps
the cookie fresh on each request.

### Organizer builds and reviews

- **Create / edit**: `form-builder.tsx` edits a `FormDefinition` in memory,
  autosaves a draft to localStorage (`drafts.ts`), and writes the whole row
  with `createForm` / `updateForm`.
- **Results**: `useFormResults(id)` loads the form and its responses.
  `analytics.ts` builds summaries, `question-summary.tsx` renders them,
  `csv.ts` exports. Triage updates go through `setResponseStatus` /
  `setResponseNote`. Photos are shown with short-lived signed URLs.

## Anonymity guarantees and limits

- Enforced at write time by a trigger, not in the UI. The organizer, CSV
  export and anything downstream never receive the name or email.
- There is no `submitted_by` or IP column.
- `anonymous` can't be switched off after the first response.
- Limits: submission time and order still exist; photos can identify people
  even without EXIF; the flood limit is per form, not per person.

## Configuration

| Variable | Used by |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/db/env.ts` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | `src/lib/db/env.ts` |

They must be literal `process.env.NEXT_PUBLIC_…` lookups so Next inlines them
at build time. Without them, development pages render a "not connected"
state (`setup-required.tsx`) and production refuses to serve.

## Deployment

- **Vercel** (production, `main`): `next build`. Supabase's GitHub
  integration applies `supabase/migrations/` to the project.
- **Cloudflare Workers** (`cloudflare-workers` branch): `vinext` builds the
  same app with Vite (`vite.config.ts`, `cloudflare.config.ts`) and deploys
  with `npm run deploy:vinext`.

## Testing

`npm test` runs Vitest over the pure modules in `src/lib`
(`validation`, `analytics`, `drafts`, `demo`, `utils`). Database rules are
checked by hand after applying migrations; see the checklist in
[supabase/README.md](supabase/README.md). End-to-end tests are on the
roadmap.
