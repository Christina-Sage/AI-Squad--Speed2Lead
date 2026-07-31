# WorkIt V2 — Convex + Three-System De-dupe · Handoff

**Purpose.** Everything needed to implement and ship the WorkIt V2 data-layer change:
move the in-memory sample data into **Convex**, and restructure it to the real
**three-system, product-aware de-dupe model** so the "Can I work it?" engine runs
against real records instead of a single mocked account.

Written to be picked up cold — including driving your **own Claude Code instance**
through the implementation, then wiring **GitHub** and **Vercel**.

| | |
|---|---|
| **Branch** | `claude/sample-data-convex-migration-qrczr7` |
| **App** | `V2-Mock/` — Next.js 16, React 19, Convex 1.42 |
| **Status** | Spec **confirmed with the business**. First-pass code is on the branch but models the **old** single-account shape — it must be reworked to §3. **Nothing is deployed.** |
| **Visual** | `V2-Mock/docs/dedupe-model.html` (open in a browser) |

---

## 0. Contents

1. [Read this first — current state & what's reusable](#1-read-this-first)
2. [Goal](#2-goal)
3. [The confirmed data model (the spec)](#3-the-confirmed-data-model)
4. [The visual](#4-the-visual)
5. [Implementation runbook — for a Claude instance](#5-implementation-runbook)
6. [GitHub + Vercel deployment runbook](#6-github--vercel-deployment-runbook)
7. [Open decisions for the team](#7-open-decisions-for-the-team)
8. [Verification checklist](#8-verification-checklist)
9. [Appendix — first-pass file map](#9-appendix--first-pass-file-map)

---

## 1. Read this first

**The branch already contains a first pass — and it's built on the wrong model.**

The commit `Add Convex-backed Salesforce provider so CRM data lives in the DB`
moved the mock fixtures into Convex, but modelled the domain the way the *mock*
did: **one unified `accounts` table** with Intacct/Fusion data embedded as
sub-objects, and leads split into two tables (`salesforceLeads` + `sdrLeads`).

Business review corrected this. The real model (§3) is:
- **Three separate source systems** — GMO Salesforce, Intacct Salesforce, SAP
  Fusion — each with their own tables. Not sub-objects of one account.
- **One GMO `leads` table** — "Salesforce leads" and "SDR leads" are the same
  thing, sourced from the GMO Lead object.
- A **product-aware** verdict: block on an *exact-product* customer match,
  review on anything else.

**So the schema and engine get reworked, not extended.** But the *plumbing* from
the first pass is reusable and worth keeping as a pattern:

| Reusable pattern | Where | Keep because |
|---|---|---|
| Provider seam already async, `SALESFORCE_PROVIDER=convex` switch | `lib/salesforce/provider.ts` | The swap point is correct; only the provider body changes |
| `fetchQuery`/`fetchMutation` server-side access | `lib/salesforce/convex-provider.ts` | Correct Convex access pattern (no React provider) |
| `replaceAll` seed mutations + guarded `/api/dev/seed` + `pnpm seed:convex` | `convex/*.ts`, `app/api/dev/seed/route.ts`, `scripts/seed-convex.mjs` | Seeding mechanism is model-independent |
| Shared validators reused by schema + seed args | `convex/validators.ts` | Keeps schema, seed, and TS types in lock-step |
| Hand-extending `convex/_generated/api.d.ts` offline | `convex/_generated/api.d.ts` | Lets you typecheck without a live Convex link |
| Fixture→Convex `clean()` (JSON round-trip drops `undefined`) + contract test | `.../fixtures/convex-seed.test.ts` | Convex `v.optional` rejects explicit `undefined` |

Full file list in [§9](#9-appendix--first-pass-file-map).

---

## 2. Goal

Make WorkIt's de-dupe **actually function** against a database:

- The **sample data** (accounts, leads, contacts, opps, activities) lives in
  **Convex**, not server RAM — so it persists across restarts and across
  Vercel's serverless instances (the mock resets on every cold start).
- The **de-dupe / workability rules** run against those rows, structured to
  mirror the **three real systems** an SDR checks, with the **product-aware**
  block/review logic the business confirmed.

Default `mock` provider stays working; `convex` is opt-in via one env var.

---

## 3. The confirmed data model

> This section is authoritative. The visual (`docs/dedupe-model.html`) is the
> same content in diagram form.

### 3.1 Three systems, ten tables

All leads originate in **GMO Salesforce** and are worked by SDRs there. Before a
lead is worked, the company is matched against the **other two** systems to see
what they already own.

| System | Tables | Role |
|---|---|---|
| **GMO Salesforce** | `accounts`, `leads`, `contacts`, `opportunities`, `activities` | System of record for leads + the accounts SDRs work. Owns TAM, ownership, opp/activity trail. |
| **Intacct Salesforce** | `accounts`, `contacts`, `opportunities`, `activities` | Customers of **Sage Intacct** only. No leads. |
| **SAP Fusion** | `accounts` | Customer-ownership record for **every non-Intacct product**. Account level only — no opps/activities. |

Plus the existing persistence tables, unchanged: `auditLog`, `savedWorklists`,
`accountOverrides`, and the work-it state table (`workItState`).

### 3.2 Products roll up to teams

The app operates at **team** level (the current `Product` enum), but the block
decision is **exact product**. So leads must carry a product, and there's a
product→team rollup.

| Team (`Product` in code) | Products (exact) | Customers live in |
|---|---|---|
| `Intacct` | Sage Intacct | **Intacct Salesforce** |
| `X3` | Sage X3 | SAP Fusion |
| `CRE` | Sage 300 Construction & Real Estate · Sage 100 Contractor · Sage Intacct Construction | SAP Fusion |
| `BMS` | **Sage 100** · **Sage 300** | SAP Fusion |
| `S50` | Sage 50 | SAP Fusion |
| `SSG` | Sage Fixed Assets · Sage HRMS · Sage Timeslips · Sage CRM · Sage BusinessVision · Sage BusinessWorks · Sage Budgeting & Planning | SAP Fusion |

**Name collisions matter** — `Sage 100` (BMS) vs `Sage 100 Contractor` (CRE),
`Sage 300` (BMS) vs `Sage 300 Construction & Real Estate` (CRE). Identity must
carry the **full, exact** product name. `Sage Intacct Construction` is a **CRE**
product and its customers live in **Fusion**, despite the name.

> The current `Product` type is `"Intacct" | "X3" | "BMS" | "S50" | "CRE" | "SSG"`
> — these are **teams**. Add a product-level type + a `product → team` map. `BMS`
> and `SSG` stay as team labels in the UI.

### 3.3 Matching (the cross-system join)

There is **no shared key** — matching is fuzzy:

- **Strong:** exact **domain / website** hit → authoritative.
- **Fuzzy:** **company name + address/geography** → a name-only match is **never
  a silent block**; it downgrades the verdict to **review**.

### 3.4 Verdict logic

Match the company across GMO / Intacct SF / Fusion, then:

| Finding | Verdict |
|---|---|
| **Current** customer of the **exact same product** as the lead | **BLOCK** |
| Customer of **any other product** (same team or not) | **REVIEW** |
| **Former** customer of any product | **REVIEW** |
| Fuzzy-only match (name/geo, no domain) | **REVIEW** |
| No match anywhere | pass → run remaining checks |

**Remaining checks and their sourcing:**

| Check | GMO | Intacct SF | Fusion |
|---|---|---|---|
| Customer / product ownership | (lead origin) | ✓ always | ✓ always |
| Open opp · DQ opp · activity (ROE) | ✓ always | ✓ **Intacct leads only** | — (no opps) |
| Partner / VAR | ✓ | ✓ | — |
| TAM | ✓ only | — | — |
| Ownership (assigned rep) | ✓ only | — | — |

- **Open-opp / DQ / activity are product-agnostic** — any open (or DQ'd within
  the 6-month cooling-off) opportunity means the account is already being worked,
  regardless of product. Only the **customer** check is product-exact.
- Fusion products' opportunities are worked in **GMO**, so there is nothing
  opp-level to read in Fusion — it is account-ownership only.
- **ROE** reads activity in GMO (+ Intacct for Intacct leads); "owned by another
  rep" is judged from **GMO ownership only**.

### 3.5 Two worked examples

**A — Blocks.** Lead *Northwind Traders*, product **Sage Intacct** (team Intacct).
Match → Intacct SF: **current Sage Intacct customer** = exact product → **BLOCK**.
(Also a Sage 100 customer in Fusion = other product = review, but block wins.)
→ **NOT WORKABLE.**

**B — Reviews.** Lead *Globex Corp*, product **Sage 300** (team BMS).
Match → Fusion: current **Sage 100** customer = same BMS team but **different
product** → **REVIEW**; Intacct SF: fuzzy name/geo, former customer → **REVIEW**;
GMO: no open opp, ROE clear, TAM valid.
→ **WORKABLE — WITH REVIEW** ("owns Sage 100, not Sage 300; genuine cross-sell").

---

## 4. The visual

Open **`V2-Mock/docs/dedupe-model.html`** in any browser — it's a self-contained
page (no build step, light/dark aware) covering everything in §3: the three
systems, the product catalog, the verdict logic, both worked examples, and the
sourcing matrix.

There is also a hosted copy as a private Claude artifact; it is private to the
original author, so the committed HTML is the shareable source of truth.

---

## 5. Implementation runbook

> Recommended: **stage it** so review is tractable — land the schema + seed
> first (PR 1), then the provider + engine rewrite (PR 2). See [§7](#7-open-decisions-for-the-team).

### 5.1 Ordered plan

1. **Product taxonomy** — add a product-level type and a `product → team` map
   (`lib/products.ts`). Keep the team `Product` type for the UI.
2. **Schema** (`convex/schema.ts` + `convex/validators.ts`) — define the 10
   source tables (§3.1). Suggested names to avoid collisions:
   `gmoAccounts, gmoLeads, gmoContacts, gmoOpportunities, gmoActivities,
   intacctAccounts, intacctContacts, intacctOpportunities, intacctActivities,
   fusionAccounts`. Each customer/account row carries product ownership +
   current/former status; leads carry an exact product.
3. **Convex functions** — per-table queries (`by_account`, `by_business_id`,
   plus domain/name lookups for matching) and the mutations the actions need.
   Reuse the `replaceAll` seed-mutation pattern.
4. **Matching module** (`lib/dedupe/match.ts`) — given a lead's domain/website/
   name/geo, return strong vs fuzzy matches per system.
5. **Provider** — rework `ConvexSalesforceProvider.getAccountBundle()` (or a new
   `assembleDedupeContext()`) to gather the GMO account + matched Intacct/Fusion
   customer records into one cross-system bundle.
6. **Engine** (`lib/workability/*`) — replace the embedded-field checks with the
   §3.4 logic: product-exact customer block/review, product-agnostic open-opp/DQ,
   ROE across GMO+Intacct, TAM (GMO), Partner/VAR (GMO+Intacct).
7. **Seed + fixtures** — build GMO/Intacct/Fusion fixtures that deliberately hit
   **each verdict path** (exact-product block, other-product review, former-
   customer review, fuzzy-only review, clean pass, open-opp block, VAR block).
8. **Tests** — rewrite the workability tests for the three-source shape; keep the
   fixture→Convex contract test.

### 5.2 Verify locally

```bash
cd V2-Mock
pnpm install
npx tsc --noEmit                     # app typecheck
npx tsc --noEmit -p convex/tsconfig.json   # convex typecheck
npx eslint .
pnpm test                            # vitest
```

Then run it against Convex:

```bash
# .env.local
SALESFORCE_PROVIDER=convex
ALLOW_DEV_SEED=1

npx convex dev      # terminal 1 — links project, regenerates convex/_generated, writes NEXT_PUBLIC_CONVEX_URL
pnpm dev            # terminal 2
pnpm seed:convex    # terminal 3 — loads fixtures (idempotent)
```

> `npx convex dev` **regenerates `convex/_generated/`** and will overwrite the
> hand-edited `api.d.ts` — expected. The hand-edit only exists so `tsc` passes
> before a Convex project is linked.

### 5.3 Kickoff prompt for your Claude Code instance

Paste something like this to start:

```
Read V2-Mock/docs/DEDUPE-CONVEX-HANDOFF.md and V2-Mock/docs/BACKEND.md in full.
We are on branch claude/sample-data-convex-migration-qrczr7. The first-pass
Convex code on this branch models the OLD single-account shape and must be
reworked to the three-system model in §3 of the handoff.

Start with PR 1: the 10-table Convex schema (§3.1), the product→team taxonomy
(§3.2), the per-table Convex functions, and seed fixtures that hit every verdict
path in §3.4. Keep SALESFORCE_PROVIDER=convex as the switch and reuse the
existing seed/replaceAll plumbing. Verify with tsc + convex tsc + eslint + vitest
before committing. Do NOT rewrite the workability engine yet — that's PR 2.
```

---

## 6. GitHub + Vercel deployment runbook

### 6.1 GitHub

- Work on `claude/sample-data-convex-migration-qrczr7` (or branch from it).
- Open PRs into the default branch for review. If the existing PR for this
  branch has already been merged, **start fresh** from the latest default branch
  under the same branch name — do not stack new commits on merged history.

### 6.2 Vercel — how the Convex link works

`scripts/vercel-build.mjs` runs `npx convex deploy --cmd 'pnpm build'` **whenever
`CONVEX_DEPLOY_KEY` is set**. That single command, on every deploy:
- pushes the Convex **schema + functions** to the deployment the key targets,
- **regenerates `convex/_generated/`** fresh (so the committed hand-edit is moot),
- injects `NEXT_PUBLIC_CONVEX_URL` into the build.

So Vercel *is* the "link" for production — no `convex dev` needed there.

### 6.3 Vercel env vars to set

| Var | Value | Why |
|---|---|---|
| `SALESFORCE_PROVIDER` | `convex` | **Without this the deployed app still uses the in-memory mock** and never reads Convex. This is the actual switch. |
| `CONVEX_DEPLOY_KEY` | prod deploy key (Convex dashboard → Settings → Deploy Keys) | Enables the `convex deploy` in the Vercel build |
| `NEXT_PUBLIC_CONVEX_URL` | prod Convex URL | Needed at **runtime** too (server-side `fetchQuery`/`fetchMutation` read it per request) |
| `ALLOW_DEV_SEED` | `1` — **temporarily**, for the one-time seed only | Guards the seed route; remove after seeding |

### 6.4 Seed production once

`convex deploy` pushes **schema + functions, not rows** — the tables come up
**empty**. After the first deploy with `ALLOW_DEV_SEED=1`:

```bash
curl -X POST https://<your-app>.vercel.app/api/dev/seed
```

Then **remove `ALLOW_DEV_SEED`** and redeploy so the seed route can't be hit again.

### 6.5 Sharp edges — read before deploying

- **Preview deploys hit prod Convex.** With a *production* deploy key,
  `convex deploy` targets the prod deployment **regardless of git branch**. A
  Vercel preview build of this branch will push the new schema to prod Convex.
  It's additive (new tables), but know it happens. Consider a **separate Convex
  dev/preview deployment + preview deploy key** for previews.
- **Deploy ≠ data.** Always re-seed after a schema change; deploy never loads rows.
- **Product enum change is a breaking data-shape change** — anything reading
  `account.product` as a team still works, but the new product-level field and
  the `product → team` map must be wired through scoring + the worklist filter.

---

## 7. Open decisions for the team

1. **Staging.** Recommended: PR 1 = schema + seed + taxonomy; PR 2 = provider +
   engine rewrite. Alternative: one big PR. Pick per your review appetite.
2. **Sample data source.** Do you have **real (sanitized) exports** from Intacct
   SF and Fusion, or should the implementer **engineer fixtures** that hit each
   verdict path? (The prototype only needs the latter.)
3. **Confirmed assumptions** (already signed off — listed so reviewers see them):
   - Block is **exact product**; different product (even same team) = review.
   - Open-opp / DQ / activity are **product-agnostic**.
   - `Sage Intacct Construction` customers are in **Fusion**.
   - **Former** customers → review; only **current** exact-product = block.
   - **Fuzzy-only** (name/geo, no domain) match → review, never a silent block.
   - TAM = GMO only. ROE activity = GMO (+ Intacct for Intacct leads). Ownership
     = GMO only. Partner/VAR = GMO + Intacct.

---

## 8. Verification checklist

Done =
- [ ] `npx tsc --noEmit` clean (app + `convex/tsconfig.json`)
- [ ] `npx eslint .` clean
- [ ] `pnpm test` green, incl. workability tests rewritten for 3 sources + the
      fixture→Convex contract test
- [ ] `pnpm seed:convex` populates all 10 tables locally
- [ ] Each verdict path in §3.4 is exercised by a fixture and asserted by a test
- [ ] `SALESFORCE_PROVIDER=convex` app renders the worklist, an account page, and
      a lead page against Convex data
- [ ] Vercel: env vars set, deploy green, prod seeded once, `ALLOW_DEV_SEED` removed

---

## 9. Appendix — first-pass file map

Committed in `Add Convex-backed Salesforce provider so CRM data lives in the DB`.
**New (added):**

```
V2-Mock/convex/validators.ts            shared field validators (reuse the pattern)
V2-Mock/convex/accounts.ts              queries/mutations/replaceAll  ┐
V2-Mock/convex/salesforceLeads.ts                                     │ rework to the
V2-Mock/convex/contacts.ts                                           │ 10-table model
V2-Mock/convex/opportunities.ts                                      │ (see §3.1)
V2-Mock/convex/activities.ts                                         │
V2-Mock/convex/sdrLeads.ts              ← merges into gmoLeads        ┘
V2-Mock/convex/workItState.ts           keep (model-independent)
V2-Mock/lib/salesforce/convex-provider.ts   rework bundle assembly (§5 step 5)
V2-Mock/app/api/dev/seed/route.ts       keep pattern; update table list
V2-Mock/scripts/seed-convex.mjs         keep as-is
V2-Mock/lib/salesforce/mock/fixtures/convex-seed.test.ts   keep the contract test
```

**Modified:**

```
V2-Mock/convex/schema.ts                add 10 source tables (replaces first-pass tables)
V2-Mock/convex/_generated/api.d.ts      hand-extended; convex dev regenerates it
V2-Mock/lib/salesforce/provider.ts      SALESFORCE_PROVIDER=convex switch (keep)
V2-Mock/package.json                    seed:convex script (keep)
V2-Mock/README.md                       convex provider notes (update to 3-system)
V2-Mock/docs/BACKEND.md                 §12 convex provider (update to 3-system)
```

**Not yet touched (need work in the rewrite):** `lib/workability/*`,
`lib/scoring/*`, the fixture generators in `lib/salesforce/mock/fixtures/*`, and
`lib/products.ts`.

---

*Prepared 2026-07-31. Questions for the author before Monday: staging (one PR vs
two) and whether real Intacct/Fusion sample data is available.*
