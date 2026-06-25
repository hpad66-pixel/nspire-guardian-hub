# Build OS (nspire-guardian-hub)

Construction-management platform — projects, financials (prime contracts, change
orders, pay apps, commitments), daily field reports, punch lists, RFIs, submittals,
and client/subcontractor/owner portals.

## Stack

- **Frontend:** Vite · React 18 · TypeScript · shadcn/ui · Tailwind CSS
- **Data/State:** TanStack Query v5 · React Router v6 · react-hook-form · zod
- **Backend:** Supabase (Postgres + RLS + Storage + Edge Functions)
- **Email:** Resend (via edge functions)
- **CI/CD:** GitHub Actions → Supabase (migrations + functions) · Cloudflare Pages (frontend)

## Local development

```bash
npm install
npm run dev          # Vite dev server (http://localhost:8080)
npm run build        # production build
npm run lint         # ESLint
npx tsc -p tsconfig.app.json --noEmit   # real type-check
npm run test         # Vitest
```

Environment variables live in `.env.local` (gitignored) — see `.env.example`.

## Database & deploy

Migrations live in `supabase/migrations/` (timestamped, one concern per file); edge
functions live in `supabase/functions/`. On push to `main`, CI runs the migration
dry-run + tests, then deploys migrations and functions to Supabase; the frontend
deploys via Cloudflare Pages.

See `CLAUDE.md` for project conventions and standing context.
