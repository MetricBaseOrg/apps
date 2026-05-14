# MetricBase Financial Tracker

Phase 0 — multi-tenant financial tracker for individuals + companies. Multi-currency (IDR/USD), multi-workspace, full P&L + balance sheet + CSV/PDF export.

- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma 7 + Neon adapter · Auth.js v5 · Recharts · pdf-lib · papaparse · decimal.js
- **Deploy:** Vercel → `apps.metricbase.org`

## Local dev

```powershell
npm install
cp .env.example .env.local   # fill in secrets — see below
npx prisma migrate dev --name init
npx tsx prisma/seed.ts        # optional demo data
npm run dev
```

Open http://localhost:3000.

### Required env vars (`.env.local`)

| Variable | How to get |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string (free tier at console.neon.tech) |
| `DIRECT_URL` | Neon direct connection string |
| `AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_URL` | `http://localhost:3000` locally; `https://apps.metricbase.org` in prod |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console → OAuth 2.0 client (Web). Redirect URIs: `<AUTH_URL>/api/auth/callback/google` |
| `AUTH_RESEND_KEY` | resend.com API key (free 3k emails/mo) |
| `AUTH_EMAIL_FROM` | `onboarding@resend.dev` until your sending domain is verified |
| `FX_PROVIDER_URL` | `https://api.frankfurter.app` (default) |
| `CRON_SECRET` | Random token used to auth Vercel cron calls |

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing |
| `/sign-in` · `/verify-request` | Auth |
| `/app` | Redirect to first workspace or onboarding |
| `/app/onboarding` | Create first workspace |
| `/app/[ws]/dashboard` | KPI + cashflow + category breakdown |
| `/app/[ws]/transactions` | Ledger with URL-state filters + CSV export |
| `/app/[ws]/accounts` | FinAccount CRUD |
| `/app/[ws]/budgets` | Per-category budgets + progress |
| `/app/[ws]/reports/{pnl,balance-sheet}` | Reports + PDF export |
| `/app/[ws]/settings/{workspace,categories,fx}` | Settings |
| `/api/auth/[...nextauth]` | Auth handlers |
| `/api/export/{csv,pdf}` | Streaming exports |
| `/api/fx/refresh` | Daily Frankfurter snapshot (cron) |
| `/api/health` | DB ping |

## Architecture notes

- **Multi-tenancy** — every model carries `workspaceId`. `requireMembership(slug)` is the gate used in every protected route + server action.
- **Multi-currency** — `Transaction.amount` is in the account's currency; `fxRate` and `baseAmount` are snapshotted at write time so reports never re-convert. Same-currency transactions short-circuit to rate 1.
- **FX cache** — `FxRate` table is unique on `(base, quote, date)`. The provider helper checks cache first, then Frankfurter on miss, and upserts. Manual overrides set `source = "manual"`.
- **Money** — all arithmetic uses `decimal.js`. Display goes through `<Money>` (mono + tabular-nums).
- **Design system** — MetricBase tokens (black/gold, Manrope + JetBrains Mono, sharp corners) ported into `src/app/globals.css` via Tailwind v4 `@theme`.

## Deploy to Vercel

1. Push this repo somewhere Vercel can read (GitHub).
2. New Vercel project, **root directory** `apps/financial-tracker`.
3. Add Neon via Vercel Marketplace (auto-injects `DATABASE_URL`).
4. Add domain `apps.metricbase.org`; DNS: CNAME `apps` → `cname.vercel-dns.com`.
5. Set env vars in Vercel project settings (same list as `.env.example`). Update `AUTH_URL` to `https://apps.metricbase.org`. Add the prod redirect URI to your Google OAuth client.
6. Build command (from `vercel.json`): `prisma generate && prisma migrate deploy && next build`.
7. Verify cron `/api/fx/refresh` is listed under Project → Cron (auto-picked from `vercel.json`).

## Milestones — Phase 0 complete

| | Status |
| --- | --- |
| M1 Foundation | done |
| M2 Auth + Workspaces | done |
| M3 Accounts & Categories | done |
| M4 Transactions + FX | done |
| M5 Dashboard + Budgets | done |
| M6 Reports + Export | done |
| M7 FX cron + Settings | done |
| M8 Polish + Deploy | done (code) — Vercel project + DNS still your move |

## Phase 1+ (not in this build)

Recurring transactions, bank feeds (Plaid/Brick), OCR receipts, team invites UI, Stripe billing, more currencies, investment positions/lots, audit log UI, public API, alerts.
