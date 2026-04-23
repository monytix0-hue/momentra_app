# Shared moments — business system architecture (backend & frontend)

This document explains **how the product’s business rules are realized in code**: where responsibility sits in the backend, how the main detail screen is laid out, what loads when, and how logic flows. It is **not** a full API catalog (see [`group-module.md`](group-module.md)) or pure product copy (see [`group-module-business-and-architecture.md`](group-module-business-and-architecture.md)).

---

## 1. What problem the architecture solves

Momentra treats **pool money** (planned vs paid contributions) and **shared bills** (who paid vendors, who owes on splits) as **two separate stories**. The backend exposes **different read models** for each; the frontend **stacks** those stories in one scroll so users see pool progress, per-person pool vs bills, settlement suggestions, then the expense log—without merging ledgers in the data model.

---

## 2. Backend — business architecture

### 2.1 Layering (who does what)

| Layer | Role in business terms |
|-------|-------------------------|
| **Router** [`backend/app/routers/group.py`](../backend/app/routers/group.py) | HTTP surface under `/group`: authenticates every request (Firebase UID), maps domain errors to status codes, forwards to services. Does **not** embed accounting rules. |
| **Domain service** [`backend/app/services/group_service.py`](../backend/app/services/group_service.py) | **Source of truth** for moment lifecycle, commitments, expenses, settlements, **member money summary**, **settlement plan** (expense-share nets + simplified transfers), positions (pool-only). |
| **Intelligence service** [`backend/app/services/group_intelligence_service.py`](../backend/app/services/group_intelligence_service.py) | Group **home** experience: today, health, signals, nudges—built **on top of** the same data, not a second ledger. |
| **Schemas** [`backend/app/schemas/group.py`](../backend/app/schemas/group.py) | Contracts for “what we return to the client” so UI can stay typed and stable. |

**Auth as business rule:** `assert_member` and `assert_admin_group` enforce *who may change shared state* (invite, record pool payment for others, etc.), which is part of the product’s trust model.

### 2.2 Read models (which question each answers)

| Capability | Business question | Logic (conceptual) |
|------------|---------------------|---------------------|
| **Commitments** | What did we **plan** vs **pay** into the pool, per person / cycle? | Rows in the commitment table; scoped by active cycle or one-off scope. |
| **Positions** | Net **pool** position (paid − planned) per person? | **Only** commitments aggregated—**not** expenses. |
| **Member money summary** | For each person: pool line **and** how much they **fronted on bills**? | Sums commitments + sums expense totals by payer; **does not** net splits here. |
| **Settlement plan** | Who should pay whom to **clear open expense shares** with minimal transfers? | Builds per-person nets from expense + shares (payer credited, others debited by open share), then **greedy** pairwise instructions. |
| **Expenses + shares** | What did we buy, who paid, how was it split? | Bill ledger; optional cycle and category/subcategory. |

Pool **payment** (`pay` on a commitment) updates **pool** paid amounts (and related cycle rollups where implemented). Creating an **expense** updates the **bill** ledger only; it does **not** satisfy pool commitments unless you also record pool payment—by design.

### 2.3 Write paths that keep the two ledgers honest

- **Ensure pool commitment rows** for active participants in pooled/hybrid moments (when the service runs) so the UI always has a **line to show** and a **target to split**—without pretending expenses paid the pool.
- **Equal split** on expenses: divides across **active** participants with remainder rules aligned to the client so server and UI agree.

### 2.4 How this maps to “business architecture”

The backend is structured so **each user-facing question** maps to a **narrow service function** and route family: you do not infer “who owes whom for dinner” from **positions**; you use **settlement plan** or expense detail. That separation is the architectural embodiment of the two-ledger product rule.

---

## 3. Frontend — business architecture

### 3.1 Layering

| Layer | Role |
|-------|------|
| **API client** [`frontend/lib/api/group.ts`](../frontend/lib/api/group.ts) | Typed calls to `/group/...`; keeps URLs and DTOs in one place. Personal taxonomy for expense labels: [`frontend/lib/api/personal.ts`](../frontend/lib/api/personal.ts). |
| **View model / selectors** [`frontend/lib/group/selectors.ts`](../frontend/lib/group/selectors.ts), [`frontend/lib/group/map-group-to-view-model.ts`](../frontend/lib/group/map-group-to-view-model.ts) | Turns raw API data into **hero**, **member cards**, **insights**—the “what to show” layer for the main screen. |
| **Coordination helpers** [`frontend/lib/group/group-detail-coordination.ts`](../frontend/lib/group/group-detail-coordination.ts) | Effective targets, cycle scoping, health-style rollups for the hero and copy. |
| **Expense labels** [`frontend/lib/group/expense-categories.ts`](../frontend/lib/group/expense-categories.ts) | Category/subcategory display from SQL-backed taxonomy when available. |
| **Screen + components** [`frontend/components/group/`](../frontend/components/group/) | Layout, modals, and presentational pieces. |

### 3.2 Route and page shell

| Piece | Purpose |
|-------|---------|
| [`frontend/app/group/[groupId]/page.tsx`](../frontend/app/group/[groupId]/page.tsx) | Full-width **page shell** (`min-h-screen`, max width, padding). |
| **`GroupDetailExperience`** | **Single** main implementation of moment detail (not the older tabbed `GroupDetailLayout`, which is not mounted by this route). |

The **business layout** is entirely inside `GroupDetailExperience`: one vertical narrative.

### 3.3 Main screen layout (top → bottom)

Order reflects **story priority**: trust and progress first, **people** second, **how to settle bills** third, **evidence** (expenses + activity) fourth, **actions** last.

1. **Back link + errors/info** — Orientation and safe failure messages (e.g. member summary or settlement plan failed independently).
2. **`GroupSummaryHero`** — Pool/coordination story: progress toward target, health-style signals from the view model.
3. **`GroupInvitePanel`** (when relevant) — Growing the participant set; admin vs read-only behavior.
4. **`GroupMembersSection`** — **Per-person cards**: pool planned/paid/pending/extra **plus** “shared bills paid” when member summary loaded; ties **two numbers** to two mental models.
5. **`GroupSettlementPlanCard`** — **Expense-share** nets and suggested transfers (scroll target for “settle shared bills”).
6. **`GroupExpensesSnapshot`** — Recent bills at a glance.
7. **`ExpenseList`** — Full bill log with category line.
8. **`GroupActivityFeed`** — Timeline of what happened.
9. **`GroupActionBar`** — Add expense, record **pool** payment, remind, settle (scroll/link behavior).

**Modals** (same screen): add expense (with personal taxonomy for category/subcategory when loaded), record payment against a **commitment** line.

### 3.4 Load logic (what happens when you open a moment)

1. **Parallel:** detail, commitments, expenses, activity, positions—core state for the view model.
2. **Then:** member money summary and settlement plan (each can fail without blocking the whole page).
3. **View model** is built from detail + commitments + expenses + positions + activity + **optional** member summary rows.
4. **Settlement plan** is stored separately and passed into `GroupSettlementPlanCard`; it uses **active cycle id** from detail when requesting the plan so **ongoing** moments stay scoped to the right period.

This ordering matches the business priority: show structure and people first; **enrich** with summary/settlement when available.

### 3.5 UI logic tied to business rules

- **Record payment** opens against a **commitment id**—reinforcing that pool payments are **not** expense entries.
- **Add expense** sends payer, equal split, optional cycle, category/subcategory—bill ledger only.
- **Remind** / **Mark paid** behaviors respect **admin vs self** rules aligned with the coordination doc and cards.
- **“Settle”** actions steer users toward **peer settlement** and the settlement card / people section, not toward mixing pool and bills.

---

## 4. End-to-end mapping (question → layer → surface)

| User question | Backend read model | Primary UI area |
|---------------|-------------------|-----------------|
| Are we on track for the **pot**? | Hero + commitments + positions | `GroupSummaryHero`, hero metrics |
| What’s **my** pool vs **bills**? | Member money summary | `GroupMembersSection` / member cards |
| Who’s ahead/behind on **pool** only? | Positions | Same view model; advanced tab shell if used |
| Who should pay whom for **bills**? | Settlement plan | `GroupSettlementPlanCard` |
| What did we actually buy? | Expenses list | Snapshot + `ExpenseList` |

---

## 5. Related docs

| Document | Contents |
|----------|----------|
| [`group-module-business-and-architecture.md`](group-module-business-and-architecture.md) | Product and accounting rules only (no code layout). |
| [`group-module.md`](group-module.md) | Tables, migrations, route inventory, file pointers. |

---

*Align this document when you add new read models or change the main detail layout; verify against `group_service.py`, `routers/group.py`, and `group-detail-experience.tsx`.*
