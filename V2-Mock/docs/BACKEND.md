# WorkIt V2 — How the Back End Works

This document explains what happens behind the scenes when you use WorkIt, in plain language. It's organized the same way you experience the app: search an account, get a verdict, see a score, work the account.

---

## 1. The Big Picture

The app is a **Next.js application** deployed on Vercel. There is no separate backend server — the backend is made up of:

1. **Server-rendered pages** — when you open a page, the server gathers all the data, runs the checks, and sends back finished HTML.
2. **API routes** — small endpoints the browser calls when you take an action (assign an account, add a contact, push to Outreach).
3. **A data layer** — a "Salesforce provider" that supplies account data, plus a Postgres database (Neon) for anything that must survive between sessions.

```
Browser
  │
  ├── Page request (e.g. /account/0015Y00000ACME01)
  │     └── Server: fetch account bundle → run 6 checks → compute score → render page
  │
  └── Action request (e.g. POST /api/assign)
        └── Server: validate → update data → write audit log → respond
```

---

## 2. The Data Layer

### 2.1 The Salesforce Provider (mock)

All account data flows through one interface: the **SalesforceProvider** (`lib/salesforce/provider.ts`). The app never talks to Salesforce directly — it asks the provider for data. Today the provider is a **mock** (`lib/salesforce/mock/`); swapping in a real Salesforce integration later means implementing the same interface, and nothing else in the app changes.

The mock holds fixture data for 11 accounts, each with:

| Record | What it contains |
|---|---|
| **Account** | name, domain, industry, type (Prospect/Customer), TAM status, owner, ABM status, **Account Buying Stage** (6sense), **Rating** (P1/P2/P3), Intacct fields (open opps, VAR status) |
| **Leads & Contacts** | name, title, owner, last activity date (drives the ROE check) |
| **Opportunities** | stage, open/closed, furthest stage reached, close date (drives open-opp and DQ checks) |

### 2.2 What persists where

| Data | Where it lives | Survives restart? |
|---|---|---|
| Account/lead/contact/opp fixtures | In memory | Resets to fixtures |
| Owner + ABM status changes | **Postgres (Neon)** — `account_overrides` table | ✅ Yes |
| Audit log (every search & action) | **Postgres (Neon)** — `audit_log` table | ✅ Yes |
| Work-it state (added contacts, applied hygiene, Outreach pushes) | In memory | Resets to fixtures |

Owner changes persist in Postgres because serverless functions don't share memory — an assignment made by one request must be visible to the next. The database is accessed via **Drizzle ORM** (`db/schema.ts`, `db/client.ts`).

---

## 3. Search

When you type into the search bar, the browser calls `POST /api/search`. The provider detects what you typed:

- **15–18 alphanumeric characters** → treated as a Global Account ID (exact match)
- **Contains a dot, no spaces** → treated as a domain (exact match)
- **Anything else** → treated as an account name (partial match)

Three outcomes: one match (you're sent straight to the account page), multiple matches (you pick from a list — e.g. two "Umbrella Corp" accounts), or none. Every search is written to the audit log.

---

## 4. "Can I work it?" — The Six Checks

Opening an account page runs `evaluateWorkability()` (`lib/workability/engine.ts`). It executes six independent checks against the account bundle:

| # | Check | Rule | File |
|---|---|---|---|
| 1 | **Customer Status** | Type = Customer with TAM blank → **blocked** (direct customer). Customer with Expired Intacct TAM → **review**. Prospect → pass. | `customer-tam.ts` |
| 2 | **TAM** | TAM blank or valid → pass. Expired Intacct TAM → **review**. | `customer-tam.ts` |
| 3 | **ROE** | Any lead **or** contact with activity in the last **30 days** owned by another rep → **blocked**. Both object types are always checked regardless of team. | `roe.ts` |
| 4 | **Open Opportunity** | Any open opp in Salesforce or Intacct → **blocked**. | `open-opportunity.ts` |
| 5 | **Disqualified Opportunity** | A DQ'd opp that reached **Discovery or later** blocks the account for **6 months after close**. A DQ'd opp that never reached Discovery does **not** block. | `dq-opportunity.ts` |
| 6 | **Partner Relationship** | VAR status starting with "Registered" (active deal registration) → **blocked**. "Potential VAR" does not block. | `partner.ts` |

The engine combines them into one verdict:

- Any hard fail → **NOT WORKABLE**
- No fails, but a review flag (expired TAM cases) → **WORKABLE WITH REVIEW**
- All clear → **WORKABLE**

It also produces the human-readable reason, a recommendation, machine-readable reason codes (for the audit log), and the six-row evidence list the UI animates.

---

## 5. "Should I work it?" — Scoring

For any account that isn't blocked, `scoreAccount()` (`lib/scoring/scoring.ts`) builds three pillars:

**Priority score = Fit × 40% + Intent × 35% + Workability × 25%**

### Fit (40%)
Signals: ICP match, product fit, vertical, **Segment**, **Account Buying Stage**.

- **Segment** is computed from industry rules (`lib/scoring/segment.ts`):
  - *Nonprofit & Software:* under $3M revenue and under 25 FTE → **Emerging**; $3M+ and 25–150 FTE → **SMB**; over 150 FTE → **Mid-market**
  - *General Business / Hospitality:* territory-based, no segment split
  - *Financial Services:* segmented by AUM
- **Account Buying Stage** comes from the 6sense field on the Global SF record. **"Target" means no engagement/intent detected, so the Fit score is docked 10 points.**

### Intent (35%)
Web intent, Outreach activity, **ABM Vertical Segmentation**, recycled MQL. These come from external systems (6sense, Outreach) that aren't wired into the mock, so they're fixture values per account.

### Workability (25%)
Computed live from Salesforce data: number of contacts on file, days since last activity (never-worked counts as fresh), and whether ROE is clear.

### P1 / P2 / P3 tier
The tier badge comes from the **Rating field on the Global SF account record** — not from the score. The score-derived tier (75+ = P1, 50–74 = P2, else P3) is only a fallback when Rating is blank. That's why an account can score 56 but still show P3.

The home worklist runs this pipeline for every account, ranks workable ones by score, and lists blocked ones with the failing check as the reason.

---

## 6. Company Research (Work-it page)

Research is routed by the **Industry field on the Global SF account**:

### Nonprofit → ProPublica (990) path
`lib/research/research-account.ts` — this makes **real network calls**:

1. Search ProPublica Nonprofit Explorer for the org, pick the best match (EIN).
2. Scrape the latest e-filed 990: total revenue, revenue breakdown (contributions/grants, program service, investment), employee count, and the Part VII officer list.
3. Scrape the company website for history and people; Wikipedia supplements the history.
4. Officers/people are filtered to **ICP titles** (CFO, Controller, Director of Finance, etc. — `lib/research/icp.ts`) and cross-referenced against Salesforce by name, so the UI can flag "found but not in CRM."

### Every other industry → Web + integrations path
`lib/research/company-intel.ts` — Healthcare, General Business, Hospitality, Financial Services, Software, etc.:

- **Revenue** — from **ZoomInfo**
- **Full-time employees** — from **LinkedIn Sales Navigator**
- **HQ location, entities/locations, parent account**
- **Recent funding** — surfaced for FinServ/Software accounts
- **Growth signals** — new hires, new locations, business changes
- **Finance hiring signals** — open finance roles, with the job description parsed for clues (e.g. "QuickBooks Enterprise (outgrowing)", "ERP migration planned", "Sage Intacct named in posting")

> Note: ZoomInfo and LinkedIn Sales Navigator aren't connected in this mock — this data is fixture-driven per account and labeled with the source each field would come from. When the real integrations land, only `getCompanyIntel()` changes; the UI stays the same.

---

## 7. Actions (API routes)

Every action endpoint follows the same pattern: **validate input → check the account exists → perform the change → write an audit log entry → respond**.

| Endpoint | What it does | Guardrails |
|---|---|---|
| `POST /api/search` | Finds accounts by ID/domain/name | Logs every search |
| `POST /api/assign` | Assigns account to you (or reassigns owner); sets ABM status to "Working"; persists to Postgres | **Refuses if the account is NOT WORKABLE** (409) |
| `POST /api/abm-status` | Updates ABM Account Status | Rejects unknown status values |
| `POST /api/contacts` | Creates a researched contact in Salesforce | New contact has no activity, so it can't trip ROE |
| `POST /api/hygiene` | Applies a suggested field update (revenue, employees, website) | — |
| `POST /api/outreach` | Pushes selected contacts into an Outreach sequence, with revenue/growth/intent signals attached | Rejects unknown sequences and empty selections |
| `GET /api/workability/[id]` | Returns the raw six-check result as JSON | — |

Who you are (demo user), your team, and product selection are stored in **cookies** and read by every endpoint — that's how the audit log knows who did what.

### Audit log
Every search, assignment, contact add, hygiene apply, and Outreach push writes a row to `audit_log` in Postgres: who, which team, what they searched, which account, the verdict and reason codes at that moment, and action-specific details. This is the compliance trail.

---

## 8. Page Rendering Flow (putting it together)

Example: you open **/account/0015Y00000ACME01**:

1. Server reads your cookies (demo user, team).
2. Provider fetches the account bundle (account + leads + contacts + opps, with any Postgres owner overrides applied).
3. Workability engine runs the six checks → verdict + evidence.
4. Scoring runs → Fit/Intent/Workability + priority + tier (from Rating).
5. A SEARCH entry is written to the audit log.
6. Page renders with all data; the browser animates the checklist reveal.

The **Work-it page** additionally runs the research path (990 or web/integrations, by industry) and loads work-it state (which contacts were already added, which hygiene fields applied, whether a push already happened).

---

## 9. Environments & Deployment

- **Local dev**: `pnpm dev` in `V2-Mock/`. Needs `.env.local` with `DATABASE_URL` (Neon Postgres), `SALESFORCE_PROVIDER=mock`, `SALESFORCE_INSTANCE_URL`.
- **Production**: Vercel project `dedupe-engine-v2` → https://dedupe-engine-v2.vercel.app. Same env vars set in Vercel.
- **Tests**: `pnpm test` — 44 unit tests covering the workability engine, checks, and provider integration.

## 10. Today vs. Fully Integrated

### 10.1 What the back end is today

Everything runs through interfaces designed for real integrations, but most sources are currently simulated:

| Data / capability | Today (mock) | Real today? |
|---|---|---|
| Account, leads, contacts, opps | Fixture data in the mock provider (11 accounts) | ❌ Mock |
| Owner / ABM status changes | Neon Postgres (`account_overrides`) | ✅ Real DB |
| Audit log | Neon Postgres (`audit_log`) | ✅ Real DB |
| Nonprofit research (990s, officers, revenue) | Live ProPublica scrape | ✅ Real |
| Website / Wikipedia company history | Live scrape | ✅ Real |
| Revenue (non-nonprofit) | Fixture labeled "ZoomInfo" | ❌ Mock |
| FTE (non-nonprofit) | Fixture labeled "LinkedIn Sales Navigator" | ❌ Mock |
| Buying Stage, ABM Vertical Segmentation, web intent | Fixture fields/signals | ❌ Mock |
| Rating (P1/P2/P3), TAM, VAR status | Fixture fields on the mock account | ❌ Mock |
| Outreach sequence push | In-memory record + audit log | ❌ Mock |
| Growth / hiring signals | Fixtures per account | ❌ Mock |

### 10.2 Target architecture with all integrations

```
                        ┌─────────────────────────────┐
                        │      WorkIt (Vercel)         │
                        │  pages · API routes · engine │
                        └──────────────┬──────────────┘
           ┌───────────────┬───────────┼────────────┬───────────────┐
           ▼               ▼           ▼            ▼               ▼
   ┌───────────────┐ ┌──────────┐ ┌─────────┐ ┌───────────┐ ┌────────────┐
   │  Global SF     │ │ SF       │ │ ZoomInfo│ │ LinkedIn  │ │  Outreach  │
   │  (primary CRM) │ │ Classic  │ │   API   │ │ Sales Nav │ │    API     │
   └───────────────┘ └──────────┘ └─────────┘ └───────────┘ └────────────┘
           ▲                                        ▲
           │ 6sense writes stage/segmentation       │
   ┌───────┴───────┐                        ┌───────┴───────┐
   │    6sense     │                        │  Web search / │
   │  (ABM/intent) │                        │  job boards   │
   └───────────────┘                        └───────────────┘
                        ┌─────────────────────────────┐
                        │   Neon Postgres (audit log,  │
                        │   overrides, cached intel)   │
                        └─────────────────────────────┘
```

### 10.3 What each integration replaces

**Global SF (primary CRM)** — replaces the mock provider for the source-of-truth fields:
- Account record: Industry (drives research routing), Type, TAM, Rating (P1/P2/P3 tier), ABM Account Status, Account Buying Stage (written by 6sense), owner
- Leads, Contacts and their last-activity dates (ROE check)
- Opportunities: open opps, DQ'd opps with stage history (open-opp + DQ checks)
- Writes back: owner assignment, ABM status updates, new contacts, hygiene field updates
- Implementation: a `GlobalSalesforceProvider` implementing the existing `SalesforceProvider` interface (REST/SOQL via a connected app). Set `SALESFORCE_PROVIDER=global-sf` — no other code changes.

**Salesforce Classic (legacy org)** — second CRM checked during de-dupe:
- Cross-org duplicate detection: same domain/company existing in Classic (customer flags, open opps, owner conflicts the Global org can't see)
- Feeds the Customer Status, Open Opportunity, and Partner/VAR checks with legacy data
- Implementation: second provider queried in parallel inside `evaluateWorkability()`; results merged into the six-check evidence ("found in SF Classic" tagged per row).

**ZoomInfo** — replaces the revenue fixture in `getCompanyIntel()`:
- Company enrichment: revenue, HQ location, entity/location counts, parent company, funding events
- Also a second source for contact discovery beyond 990 officers/website scrape
- Implementation: ZoomInfo Enrich API keyed by domain; cache responses in Postgres (enrichment calls are billed per lookup).

**LinkedIn Sales Navigator** — replaces the FTE fixture:
- Employee count and headcount-growth trend (the "+14% over 12 months" growth signal)
- New-hire alerts for finance leadership (CFO/Controller changes)
- Open finance roles for the hiring-signal card (paired with job-board search for the description text that gets parsed into clues)
- Implementation: Sales Navigator Application Platform API; sync nightly into Postgres rather than calling per page view.

**6sense** — replaces the intent fixtures:
- Account Buying Stage (Target/Awareness/Consideration/Purchase/Decision) — already modeled as a field on the account; 6sense keeps it updated in Global SF, so this arrives "for free" once Global SF is live
- ABM Vertical Segmentation and web-intent signals (pricing-page visits, demo requests) for the Intent pillar
- Implementation: read from the 6sense-synced SF fields where possible; 6sense Company Details API for the richer intent signals.

**Outreach** — replaces the in-memory push:
- Real sequence list (replaces the hardcoded `SEQUENCES` array — fetched from `GET /sequences`)
- Push = create/find prospects, add to sequence via Outreach API
- Revenue/growth/intent signals attached as prospect custom fields or account notes so reps see them on the Outreach dashboard
- Sequence-state webhooks back into the audit log (delivered, replied, bounced)

### 10.4 Integration rollout notes

- **Order matters**: Global SF first (it's the source of truth everything else keys off), then SF Classic (completes de-dupe), then ZoomInfo + Sales Navigator (research), then 6sense + Outreach (scoring + action).
- **The seams already exist**: `SalesforceProvider` (CRM), `getCompanyIntel()` (enrichment), `researchAccount()` (nonprofit path), `SEQUENCES` + `/api/outreach` (Outreach). Each integration replaces the inside of one seam; pages, engine, scoring, and UI don't change.
- **Caching**: paid APIs (ZoomInfo, Sales Navigator) should be cached in Postgres with a TTL (e.g. 30 days) instead of hit on every page view.
- **Secrets**: each integration adds env vars in Vercel (API keys / OAuth credentials), same pattern as `DATABASE_URL` today.

### Known mock limitations
- In-memory state (fixtures, work-it actions) resets whenever the server restarts, and on Vercel isn't shared between serverless instances. Owner/ABM changes are the exception — they persist in Postgres.
- V1 and V2 share the same Neon database, so assignments made in one show up in the other.
- ZoomInfo / LinkedIn Sales Navigator / 6sense / Outreach are represented by fixtures, labeled with their real source names, behind interfaces designed for the real integrations.
