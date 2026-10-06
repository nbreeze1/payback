# Payback

Tracks money owed to my parents (school, credit cards, flights, phone bills, other) and what I've paid back.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind v4) · Supabase (auth + Postgres) · Vercel (auto-deploys from GitHub `main`).

## Run locally
1. `cp .env.example .env.local` and fill in the Supabase URL + publishable key.
2. `npm install`
3. `npm run dev` → http://localhost:3000

## Data
- `charges` — title, category (`school | credit_card | flight | phone | other`), amount, date, notes
- `payments` — amount, date, method, notes

No login: it is a shared family ledger, and anyone with the link can view, add and delete entries (open RLS policies for anon). Totals are calculated in `src/components/Tracker.tsx`.

