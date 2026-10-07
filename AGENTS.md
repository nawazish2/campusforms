<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Learned User Preferences

## Learned Workspace Facts

- CampusForms is Next.js 16 + Convex (Convex Auth with Google, Convex database and file storage). There is no ORM or API layer of our own; `convex/` is the only code that reads or writes data, and every function checks identity and the business rules itself.
- Organizers sign in with Google and must be on the `allowedOrganizers` allowlist (`npx convex run admin:allowOrganizer '{"email":"..."}'`); students have no accounts and submit through public form links.
- Anonymity is enforced in `convex/responses.ts` `submit`: it stores null name/email on anonymous forms, and there is no submittedBy or IP field. Public `/status` REF lookup returns queue status only — never answers; only the form owner can read responses.
- Production is https://campusforms.vercel.app.
