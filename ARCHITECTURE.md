# Architecture

How CampusForms is put together and why. For what the product does and how to
run it, see [README.md](README.md).

## System overview

```
                 ┌──────────────────────────────────────────────┐
  Organizer ───▶ │  Next.js 16 app (App Router, React 19)       │
  (Google SSO)   │                                              │
                 │  proxy.ts        finishes sign-in, /dashboard│
  Student ─────▶ │                  guard                       │
  (no account)   │  server code     OG metadata, share images   │
                 │  client pages    everything else             │
                 └───────────────┬──────────────────────────────┘
                                 │ Convex client (WebSocket)
                                 │ + auth token (if signed in)
                 ┌───────────────▼──────────────────────────────┐
                 │  Convex                                      │
                 │  Functions  queries + mutations: every rule  │
                 │  Database   forms, responses, allowlist      │
                 │  Auth       Convex Auth, Google OAuth        │
                 │  Storage    response photos                  │
                 └──────────────────────────────────────────────┘
```

There is no data API of our own and no ORM. The browser can only call Convex
functions, so **the functions are the entire authorization and validation
layer**: each one decides who is asking and what they may do. Anything enforced
only in the browser is treated as not enforced, because the deployment URL is
in every page's source.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (Turbopack), React 19, TypeScript |
| Styling | Tailwind v4, small hand-written UI kit in `src/components/ui/` |
| Animation | framer-motion |
| Data / auth / files | Convex (`convex`, `@convex-dev/auth` with the Google provider) |
| Tests | Vitest: unit tests for `src/lib`, `convex-test` for the backend rules |
| Hosting | Vercel (production). A Cloudflare Workers build via vinext lives on the `cloudflare-workers` branch |

## Directory map

```
convex/
  schema.ts                tables, indexes, validators — the data model
  rules.ts                 deadline, answer types, size, ref: pure functions
  lib.ts                   ownership checks, doc → UI shape mappers
  forms.ts                 form queries and owner mutations
  responses.ts             submit, triage, lookupByRef, photos
  organizerRequests.ts     public "request access" insert
  admin.ts                 internal: allowOrganizer / removeOrganizer
  organizers.ts            the allowlist check used at sign-in
  auth.ts, auth.config.ts, http.ts   Convex Auth wiring
  users.ts                 `me`, behind useAuth()
  seed.ts                  internal: seed:dev sample data
  _generated/              written by `npx convex dev`; committed
src/
  proxy.ts                 Next 16's renamed middleware
  app/
    page.tsx               landing
    browse/                public notice board of open forms
    f/[id]/                fill page (client) + server layout for metadata
                           + opengraph-image.tsx for link previews
    status/                look up a response by its REF code
    login/                 Google sign-in, organizer access requests
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
    convex-provider.tsx    Convex client + Convex Auth provider
    auth-provider.tsx      useAuth(): user, ready, signInWithGoogle, signOut
    ui/                    buttons, dialogs, inputs, etc.
    landing/               landing page sections
  lib/
    db/
      env.ts               reads NEXT_PUBLIC_CONVEX_URL once
      hooks.ts             live-query hooks for pages
      actions.ts           mutation hooks, newResponseRef, errorMessage
      server.ts            fetchQuery for metadata and share images
      schema.ts            FormSummary type
    types.ts               domain types (FormDefinition, Question, …)
    validation.ts          fill + builder validation (UX only)
    analytics.ts           response summaries
    csv.ts                 CSV export
    templates.ts           the 14 starter templates
    drafts.ts              localStorage drafts (builder and fill page)
    submissions.ts         localStorage "already submitted" marker
    photos.ts              client-side resize + EXIF strip before upload
    demo.ts                in-memory sample form for /browse and /f/demo
tests/convex/              backend rules, run with convex-test
```

## Rendering model

Almost every page is a client component (`'use client'`). Data comes through
`useQuery` hooks in `src/lib/db/hooks.ts`, so every list and count is live: a
student's submission appears on the organizer's results page without a refetch.
The few `refresh()` functions pages still call are no-ops kept so those pages
didn't have to change.

Server code is limited to three places:

1. **`src/proxy.ts`** runs on every non-static request. `convexAuthNextjsMiddleware`
   finishes the Google sign-in (it trades the one-time `code` in the URL for
   session cookies) and proxies auth actions to Convex. On top of that it
   redirects signed-out visitors from `/dashboard/*` to `/login?next=…`. In
   production it throws if `NEXT_PUBLIC_CONVEX_URL` is missing, so a bad deploy
   can't leave the dashboard unguarded.
2. **`ConvexAuthNextjsServerProvider`** in the root layout reads the session
   cookies so the first render already knows who is signed in. Because it reads
   cookies, no route is prerendered as static.
3. **`src/app/f/[id]/layout.tsx` and `opengraph-image.tsx`** call `fetchQuery`
   to read the public form for titles and share cards for WhatsApp/Slack
   previews.

Writes never go through Next.js. Pages call mutations from
`src/lib/db/actions.ts` directly against Convex.

## Data layer

### Boundary rule

`convex/` is the only code that reads or writes data. Convex's validators check
the arguments' shape; the functions check identity and the business rules. The
queries return the UI's shapes already (`_id` → `id`, `_creationTime` → ISO
`createdAt`, and the owner id never leaves the server), so there is no row
mapper on the client.

User-visible failures are thrown as `ConvexError` with the sentence as data.
A plain `Error` would be redacted to "Server Error" on a cloud deployment;
`errorMessage()` in `actions.ts` reads either kind.

### Tables

| Table | Purpose | Key fields |
|---|---|---|
| `forms` | One document per form | `ownerId`, `status` (`draft`/`open`/`closed`), `category`, `anonymous`, `deadline` (string), `questions` (array), `pinned`, `maxResponses`, `responseCount` |
| `responses` | One document per submission | `formId`, `ref` (16-hex, unique), `respondentName`, `respondentEmail`, `answers` (object keyed by question id), `status` (`new`/`in-progress`/`done`), `publicNote` |
| `allowedOrganizers` | Emails allowed to sign in | written only by `admin:*` |
| `organizerRequests` | Access requests from `/login` | insert-only for the public |
| `users`, `authAccounts`, `authSessions`, … | Convex Auth's tables | `authTables` in `schema.ts` |

Submission time is the document's `_creationTime`; there is no separate column.
Photos live in Convex file storage; a `file` answer stores the storage id.

Adding an optional field to `schema.ts` needs no migration.

### Why `questions` and `answers` are nested values

Nothing queries a single question. The builder rewrites the whole array on
each save and every summary iterates it in JS, so a form saves as one write and
question ids stay stable.

### Why `deadline` is a string

It stores two different things: `2026-09-25` (end of that local day) and
`2026-09-25T18:00` (a local wall-clock time). Neither has a timezone. A
timestamp would lose the difference.

## Authorization

| Action | Who | Function |
|---|---|---|
| Read any form, any status | Anyone (closed/draft forms must render an explanation) | `forms.get` |
| List open forms | Anyone | `forms.listOpen` |
| Create / update / delete / pin / publish / duplicate a form | Its owner | `forms.*` |
| Submit a response | Anyone, if the form is open | `responses.submit` |
| List / triage / delete responses | The form's owner | `responses.listForForm`, `setStatus`, `setNote`, `remove` |
| Edit a response | The form's owner, and only `status` / `publicNote` | `setStatus`, `setNote` |
| Get an upload URL | Anyone, for an open form | `responses.generateUploadUrl` |
| View a photo | The owner of the response's form | `responses.photoUrl` |
| Look up a response by REF | Anyone — returns status, form title, category, time, anonymity flag and public note, never answers | `responses.lookupByRef` |
| Sign in as organizer | Only emails in `allowedOrganizers` | `afterUserCreatedOrUpdated` in `auth.ts` |
| Edit the allowlist | Nobody through the API; CLI or dashboard only | `admin:*` (internal) |

Owner queries return `null` or `[]` for a signed-out caller or someone else's
form, so a page renders "not found" instead of crashing. Owner mutations throw.

## What `responses.submit` enforces

One mutation does all of this, in order, in one transaction. `validation.ts`
repeats some of it in the browser only to show good error messages.

1. The form exists (a malformed id is "does not exist", not a thrown error) and
   is `open`.
2. The ref is 16 lowercase hex (uppercase is lowercased).
3. The deadline: `2026-09-25` ends with that day, `2026-09-25T18:00` is a wall
   clock, both read as UTC and given a 14-hour grace so the server only rejects
   once the deadline has passed in every timezone.
4. The `maxResponses` cap.
5. The flood limit: at most 30 responses per form per minute.
6. `answers` is an object, at most 20,000 bytes serialized.
7. Every key is a question id of this form.
8. Required questions are answered (blank string, empty array and null count
   as unanswered).
9. Each answer matches its type: rating is an integer from 1 to `maxRating`,
   number is numeric, single-choice and dropdown are one of the options,
   multi-choice is an array of options, email and date have their shapes, other
   types (including unknown ones) are strings.
10. Each `file` answer is a real storage id of a JPEG, PNG or WebP of at most
    5 MB.
11. The ref is not already used.
12. Insert with status `new` and an empty note; name and email become `null` on
    an anonymous form; then `responseCount` goes up by one.

Other invariants: `responseCount` is written only by submit and delete;
`anonymous` can't change after the first response; deleting a form deletes its
responses and photos in batches; deleting a response deletes its photos.

Organizer requests: email lowercased, trimmed, valid and at most 200 characters;
note at most 500; one request per email; at most 10 requests per 10 minutes
overall.

## Key flows

### Student submits a response

```
/f/[id] (client)
  ├─ usePublicForm(id)          live query: forms.get
  ├─ validateFill()             browser-side errors only
  ├─ ref = newResponseRef()     16 hex chars, crypto.getRandomValues
  ├─ for each photo answer:
  │    preparePhoto()           resize to 1600px, re-encode (drops EXIF)
  │    generateUploadUrl()      then POST the blob; the answer is the storage id
  ├─ responses.submit(...)      every rule above, one transaction
  ├─ markSubmitted(formId)      localStorage hint, not enforcement
  └─ show REF on success screen
```

The `ref` is generated in the browser because the student cannot read their own
response back. On a ref collision the call retries once with a new ref.

The demo form (`/f/demo`) is handled entirely in the client (`isDemoFormId`)
and never reaches Convex.

### Student checks status

`/status` → `responses.lookupByRef(ref)` → form title, triage status,
submission time, the organizer's public note. No answers.

### Organizer signs in

```
/login → signIn('google', { redirectTo: /login?next=…&via=google })
       → Google → Convex's /api/auth/callback/google
       → afterUserCreatedOrUpdated checks allowedOrganizers
         (a throw rolls the sign-in back: no user, no session)
       → redirect to /login with a one-time code  (success)
         or with no code                           (refused or cancelled)
       → proxy.ts exchanges the code for cookies, the page redirects to next
```

Convex Auth drops a refused sign-in back at `redirectTo` with no error. The
login page uses `via=google` to know a sign-in was attempted, and shows the
"not on the organizer list, or cancelled" message when the user is still signed
out afterwards.

### Organizer builds and reviews

- **Create / edit**: `form-builder.tsx` edits a `FormDefinition` in memory,
  autosaves a draft to localStorage (`drafts.ts`), and saves the whole form
  with `forms.create` / `forms.update`.
- **Results**: `useFormResults(id)` subscribes to the form and its responses.
  `analytics.ts` builds summaries, `question-summary.tsx` renders them,
  `csv.ts` exports. Triage goes through `setResponseStatus` /
  `setResponseNote`. Photos are shown from URLs that `responses.photoUrl`
  returns only to the owner.

## Anonymity guarantees and limits

- Enforced when the response is written, in `responses.submit`, not in the UI.
  The organizer, CSV export and anything downstream never receive the name or
  email.
- There is no `submittedBy` or IP field.
- `anonymous` can't be switched off after the first response.
- Limits: submission time and order still exist; photos can identify people
  even without EXIF; the flood limit is per form, not per person.

## Configuration

| Variable | Where | Used by |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Next.js environment | `src/lib/db/env.ts`, `proxy.ts`, the Convex client |
| `CONVEX_DEPLOYMENT` | `.env.local`, written by `npx convex dev` | the Convex CLI |
| `SITE_URL` | Convex deployment env | where Convex Auth sends the browser after sign-in |
| `JWT_PRIVATE_KEY`, `JWKS` | Convex deployment env | Convex Auth token signing |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Convex deployment env | the Google provider |

`NEXT_PUBLIC_CONVEX_URL` must be a literal `process.env.NEXT_PUBLIC_…` lookup so
Next inlines it at build time. Without it, development pages render a "not
connected" state (`setup-required.tsx`) and production refuses to serve.

Convex deployment variables are set with `npx convex env set` (or the
dashboard), not in `.env.local`.

## Deployment

- **Vercel** (production, `main`): `next build`, with `NEXT_PUBLIC_CONVEX_URL`
  pointing at the production Convex deployment. Backend changes ship with
  `npx convex deploy`.
- **Cloudflare Workers** (`cloudflare-workers` branch): `vinext` builds the
  same app with Vite (`vite.config.ts`, `cloudflare.config.ts`) and deploys
  with `npm run deploy:vinext`. Not re-checked since the move to Convex.

## Testing

`npm test` runs Vitest in two projects. `app` covers the pure modules in
`src/lib` (`validation`, `analytics`, `drafts`, `demo`, `utils`). `convex`
(`tests/convex/`) runs the real backend functions in-process with `convex-test`
under the edge runtime: anonymity, deadline, closed and draft forms, the cap,
the flood limit, every answer type, ref format and uniqueness, count
bookkeeping, the anonymity lock, owner-only access, `lookupByRef`, organizer
requests and the allowlist check. The Google OAuth round trip itself isn't
testable that way. End-to-end tests are on the roadmap.
