# Aurum DQA Pulse

Data quality monitoring platform for The Aurum Institute — replaces the Excel → Teams → Power BI consolidation workflow.

## Stack

- Next.js (App Router) on Vercel
- Postgres on Neon (Drizzle ORM)
- Auth.js (NextAuth) credentials — roles: `dqm`, `merl_officer`
- Excel parsing via exceljs (header-driven, not cell-hardcoded)

## Setup

```bash
cp .env.example .env.local   # or use existing .env.local
npm install
npm run db:migrate
npm run db:seed
npm run db:backfill          # optional: parse reference/ or a folder of historical xlsx
npm run dev
```

Demo logins (after seed):

- `dqm@aurum.org.za` / `dqa-demo-2024`
- `merl@aurum.org.za` / `dqa-demo-2024`

## Features

| Area | Path |
|---|---|
| Web form entry | `/entry` |
| Excel upload | `/upload` |
| Review & lock | `/review` |
| Trends (month/quarter/year + rates) | `/trends` |
| Power BI export | `/export` |
| Audit trail | `/audit` |
| Auto-lock cron | `/api/cron/auto-lock` (daily 02:00 UTC) |
| Scheduled export | `/api/cron/export` (daily 02:30 UTC) |

## Important rules

- **Rates are never stored.** They are computed from summed counts at the selected grain (`src/lib/rates.ts`).
- **Locked months are read-only.** Corrections use the entry flow with `isCorrection` — history is append-only.
- **MERL transformation** for Power BI is isolated in `applyMerlTransformation()` (`src/lib/export/powerbi.ts`) — currently a pass-through.
- Reference workbook: `reference/ACC1_DS-TB_DQA_tool_v3.xlsx`

## Env

```
DATABASE_URL=
AUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
CRON_SECRET=          # required in production for cron routes
```
