<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Learned User Preferences

## Learned Workspace Facts

- CampusForms is Next.js 16 + Supabase (auth, Postgres, RLS), not Convex. There is no ORM or API layer; `src/lib/db/` is the only code that talks to Supabase, and RLS is the whole authorization model.
- Organizers sign in with Google and must be allowlisted in `allowed_organizers`; students have no accounts and submit through public form links.
- Anonymity is enforced in the database: triggers strip name/email on anonymous forms, and there is no `submitted_by` or IP column. Public `/status` REF lookup returns queue status only — never answers; only the form owner can read responses.
- Production is https://campusforms.vercel.app.
