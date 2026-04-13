# Momentra v2 — Claude Knowledge Base

## Project Overview

Momentra is a personal + group finance tracking app.
- **Personal module** — individual budgets, savings goals, transaction ledger, financial intent model
- **Group module** — shared expense splitting, commitment tracking, pool contributions
- **Business module** — exists but not actively developed

## Monorepo Structure

```
momentra_v2/
├── backend/          FastAPI + Supabase (Python 3.11+)
├── frontend/         Next.js 16 + Cloudflare Pages (TypeScript)
└── supabase/
    └── migrations/
        ├── personal/   personal_* tables
        ├── group/      group_* tables
        └── business/   business_* tables
```

---

## Backend

**Stack:** FastAPI · Supabase (PostgREST, not Django ORM) · Firebase Admin (auth) · Python 3.11

**Run locally:**
```bash
cd backend
uvicorn app.main:app --reload --port 8002
```

**Docker (production):**
```bash
cd backend
docker compose up -d          # runs on port 8002
docker compose build --no-cache && docker compose up -d   # rebuild
```

**Lint / format:**
```bash
cd backend
ruff check . && ruff format .
```

**Key directories:**
```
backend/app/
├── routers/
│   ├── personal.py     GET/POST/PATCH /personal/*
│   ├── group.py        GET/POST/PATCH /group/*
│   └── business.py
├── schemas/
│   ├── personal.py     Pydantic models (GoalCreate, BudgetOut, PersonalSummaryOut …)
│   └── group.py
├── services/
│   ├── personal_service.py   build_summary(), generate_insights(), recompute_*
│   └── group_service.py
└── core/
    └── supabase.py     Service-role Supabase client (lru_cache singleton)
```

**Auth:** Firebase ID token passed as `Authorization: Bearer <token>`. `get_current_user_id` dependency extracts `user_id` (Firebase UID string).

**Database access:** All DB calls go through the Supabase PostgREST client (`sb.table(...).select/insert/update/delete`). Never use raw SQL — always PostgREST chaining. Wrap all DB calls in `try/except APIError`.

**Ownership checks:** Always verify user owns a resource before mutating it (query with both `id` and `user_id`).

---

## Frontend

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS · Cloudflare Pages (`next-on-pages`)

> **IMPORTANT:** Next.js 16 has breaking API changes from earlier versions. Read `node_modules/next/dist/docs/` before using any Next.js API you're unsure about.

**Run locally:**
```bash
cd frontend
npm run dev         # dev server
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run build       # production build
```

**Deploy:** Cloudflare Pages via `wrangler.toml` (`name = "momentra-v1"`). Build output: `.vercel/output/static`.

**Production API:** Set `NEXT_PUBLIC_API_URL` to the deployed FastAPI origin (e.g. `https://backend.mallaapp.org`) in the Pages project environment so the browser never calls `localhost`. The API’s `CORS_ORIGINS` must list every frontend origin that uses it (e.g. `https://momentra.tech`).

**Route structure:**
```
frontend/app/
├── page.tsx              Home / gateway
├── login/                Auth page
├── personal/             Personal finance shell
│   └── personal-shell.tsx
├── group/
│   ├── page.tsx          Group list
│   ├── new/              Create group
│   └── [groupId]/        Group detail
└── business/
```

**Component locations:**
```
frontend/components/
├── personal/
│   ├── personal-dashboard.tsx        Main personal page (large — ~1500 lines)
│   ├── personal-money-hero.tsx       Plan remaining hero card
│   ├── personal-trigger-bar.tsx      Today's signal bar
│   ├── personal-today-snapshot.tsx   Daily spend snapshot
│   ├── personal-spend-pace-card.tsx  Monthly pace visual
│   └── personal-category-insights.tsx
└── group/
    ├── group-detail-layout.tsx       Group detail (tabs: overview, commitments, expenses, activity, positions)
    └── expense-list.tsx              Member | Paid | Share table
```

**API client layer:** `frontend/lib/api/personal.ts` and `group.ts` — all backend calls go through typed fetch wrappers here. Add new API functions here when adding endpoints.

**Utility / logic:**
```
frontend/lib/personal/
├── budget-templates.ts          BUDGET_TEMPLATES, SAVINGS_STYLES, suggestSavingsTarget()
├── goal-templates.ts            GOAL_TEMPLATES
└── personal-dashboard-insights.ts   computeMonthlyPace(), moneyLeftStory(), buildPersonalTrigger()
```

**Design tokens / CSS classes used throughout:**
- `rounded-m-hero`, `rounded-m-card`, `rounded-m-chip`, `rounded-m-cta`, `rounded-m-badge`
- `bg-bg`, `bg-bg2`, `bg-surface-100`, `bg-ctx-hero`, `border-surface-300`, `border-rule`
- `text-ink`, `text-ink-2`, `text-ink-3`, `text-ink-4`, `text-ink/35`, `text-ink/65`
- `text-ctx-accent`, `bg-gradient-to-br from-ctx-accent to-ctx-accent-end`
- `duration-fast`, `duration-medium`, `ease-standard`
- Reuse these — do not invent new token names.

---

## Financial Intent Model

Core concept — two-step budget setup:

| Step | What it sets | Field |
|---|---|---|
| Step 1 — Primary Budget (Lifestyle) | Monthly spending limit | `lifestyle_budget` = `total_allocated` |
| Step 2 — Savings Style (Discipline) | Monthly savings target | `savings_target` |

**Planned Monthly Envelope** = `lifestyle_budget + savings_target`
**Plan Remaining** = `planned_envelope - total_spent_period`
**Potential Savings** = `planned_envelope - actual_spending` (same as Plan Remaining)
**Savings Contributed** = `max(0, total_income_period - total_spent_period)`

These are computed in `backend/app/services/personal_service.py → build_summary()` and returned by `GET /personal/summary` as `PersonalSummaryOut`.

**UX rule:** Never say "Money Left" or "Balance Left" in the UI. Always use **"Plan Remaining"** — it's tied to intent, not a bank balance.

---

## Database (Supabase PostgreSQL)

Migrations live in `supabase/migrations/{personal,group,business}/`. Apply via Supabase CLI or dashboard.

**Personal tables:** `personal_moments`, `personal_cycles`, `personal_transactions`, `personal_budgets`, `personal_goals`, `personal_signals`, `personal_transaction_categories`, `personal_transaction_subcategories`

**Group tables:** `group_moments`, `group_participants`, `group_cycles`, `group_commitments`, `group_expenses`, `group_expense_shares`, `group_positions`, `group_activity`, `group_recurring_expenses`

---

## Key Conventions

- **New backend endpoint** → add schema in `schemas/`, handler in `routers/`, import schema in router, add typed fetch fn in `frontend/lib/api/*.ts`
- **Supabase ownership**: always verify `user_id` ownership before update/delete
- **No raw SQL**: use PostgREST chaining only
- **Type-check before committing**: `cd frontend && npm run typecheck`
- **Backend lint before committing**: `cd backend && ruff check .`
- **Commit style**: conventional commits (`feat:`, `fix:`, `chore:`) with scope e.g. `feat(personal):`, `feat(group):`
- **Git remote**: `origin` → `https://github.com/resolvingpoint-dot/momentra_v1.git` (branch: `main`)
