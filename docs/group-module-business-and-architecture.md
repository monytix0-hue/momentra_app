# Shared moments — business rules

This document states **product and accounting rules** for shared finances in Momentra: what each concept means, how money is modeled, and how users should interpret the app. It does not describe APIs, code, or screens.

For database tables, migrations, and technical architecture, see [`group-module.md`](group-module.md).

---

## 1. What you’re planning together

A **moment** is a shared space where several people coordinate money: a trip, a household slice, a club pot, or ongoing bill-splitting. Each moment has a **funding model** (how you mainly think about money), optional **targets** and **time buckets (cycles)**, and **participants** with roles (e.g. who can administer the moment).

---

## 2. Core concepts (plain language)

| Concept | Meaning |
|--------|---------|
| **Participant** | Someone in the moment: named, optionally linked to a signed-in account; may be invited, active, or removed. |
| **Cycle** | An optional period (for example a month) with its own target and how much has been collected toward that period. |
| **Commitment (pool)** | How much each person **planned** to put into the shared pot for a scope (often a cycle), and how much they have **actually paid** toward that plan. |
| **Shared expense** | A real-world bill: who paid the merchant, how the total is split across participants, and what is still owed or marked settled per share. |
| **Settlement (peer payment)** | A record that one person paid another **outside the app** to square up; the app logs it so everyone stays aligned. |

---

## 3. Two separate ledgers (most important rule)

Momentra keeps **two ledgers** and does **not** merge them automatically:

| Ledger | What it tracks | What users usually see |
|--------|----------------|-------------------------|
| **Pool (commitments)** | Planned vs paid **contributions** toward the shared target or pot. | Planned amount, contributed (pool), what’s still open on the pool, extra paid beyond plan. |
| **Shared expenses** | Who **fronted** vendor payments and how splits flow between people. | Per-bill payer and shares; totals like “shared bills paid” by person; “who should pay whom” from **expense shares** only. |

**Rule:** Paying a restaurant bill or rent split **does not** by itself count as paying your **pool** commitment. Pool “paid” only moves when a payment is recorded **against a commitment** (for example an admin recording that someone put money toward the pot). That separation avoids double-counting and keeps intent clear: *pool* = we agreed to fund X together; *expenses* = we split real receipts.

---

## 4. Funding models

- **Pooled** — The moment is mainly about collecting toward a **shared target**; commitments express each person’s share of that target.
- **Split expenses** — The moment is mainly **bill-splitting**; pool lines may be unused or minimal.
- **Hybrid** — Both a shared pot and shared bills matter; users need to read **pool** cards and **expense** / **settlement** views together.

**Auto-planning pool commitments:** For **pooled** and **hybrid** moments, the product can create or top up **commitment** rows so active participants get an equal split of what’s left of the target for the current scope (one-time vs ongoing is handled in product logic). **Split-expenses–only** moments are not forced into pool commitment rows by that path.

---

## 5. Member money at a glance

For each participant, the product distinguishes:

- **Pool side:** planned contribution, contribution paid, pending, and any **extra** paid beyond what was planned (for that scope).
- **Expense side:** how much they have **paid to vendors** on shared bills in scope (sum of bills they paid), separate from pool.

These two numbers answer different questions; they are **not** added into one “balance.”

---

## 6. Positions vs settlement

- **Pool position** is **planned vs paid on commitments** (are you ahead or behind on the **pot**?). It does **not** answer “who owes whom for last week’s dinner.”
- **Settlement suggestions** for shared bills come from **open expense shares**: who paid, who still owes on each split, rolled into **net balances** per person, then simplified into a small set of **suggested transfers** (minimal pairwise payments that clear those nets). This is the usual “Splitwise-style” mental model for **bills**, not for the **pool**.

Optional **manual settlement records** (A paid B externally) are a **log** of peer payments; they complement the expense ledger depending on how the product records them.

---

## 7. User-visible flows (business meaning)

**Record money toward the shared pot**  
Someone with permission records payment **on a commitment line** → pool paid amounts and cycle collected totals update. This does not replace logging a **shared expense** when the money went to a vendor.

**Add a shared expense**  
Someone enters who paid, the total, and how it’s split (equal or otherwise). That updates **expense** and **settlement** views; it does **not** automatically satisfy pool commitments.

**See who should pay whom for bills**  
The app derives nets from **expense shares** in scope (for example the active cycle) and may show suggested transfers to clear those nets. That is separate from **pool** progress.

---

## 8. Scope of this document

This file is intentionally **business-only**: rules and meanings, not implementation.

**See also:** [`group-module-business-system-architecture.md`](group-module-business-system-architecture.md) — how backend and frontend layers, layout, and load logic realize these rules; [`group-module.md`](group-module.md) for SQL and route inventory.
