# De-dupe: product/TAM-aware verdict + ABM writes

What this change adds to the "Can I work it?" engine, and the decisions behind
it. Companion to `DEDUPE-CONVEX-HANDOFF.md` (the original three-system spec) and
the authoritative audit SOPs in [`dedupe-audit/`](./dedupe-audit/).

## Why

The engine blocked *any* customer with an active TAM, regardless of product. The
business runs it product-aware: a company that owns one Sage product is a
genuine cross-sell for another. This makes the customer verdict compare the
**exact product** being worked against what the company already owns, matched
across the three source systems.

## Data model — ten Convex source tables

The three systems are stored as **ten separate Convex tables** (the real shape),
while the app UI still reads the embedded `Account` / `AccountBundle`. The
provider reassembles on read, so the UI is unchanged.

| System | Tables |
|---|---|
| **GMO Salesforce** | `gmoAccounts`, `gmoLeads`, `gmoContacts`, `gmoOpportunities`, `gmoActivities` |
| **Intacct SF** | `intacctAccounts`, `intacctContacts`, `intacctOpportunities`, `intacctActivities` |
| **SAP Fusion** | `fusionAccounts` **only** — customer + partner ownership; **no opps, no activity** |

`lib/salesforce/source-tables.ts` is the single source of truth for the mapping:
`decomposeToSourceTables()` splits the embedded fixtures into the ten tables (the
seed path), and `assembleAccount()` reassembles one embedded `Account` from them
(the Convex provider). They are inverses.

The embedded `Account` also carries two additive fields used by the verdict:

| Field | Meaning |
|---|---|
| `Account.workedProduct?: ExactProduct` | Exact product being worked (full name — resolves Sage 100 vs Sage 100 Contractor). Falls back to a representative product of the segment. |
| `Account.customerProducts?: CustomerProductOwnership[]` | Products the company owns, each tagged `system` (Intacct/Fusion) + `status` (current/former). Reassembled from `intacctAccounts.products` + `fusionAccounts.products`. Drives the verdict; absent → the engine falls back to the `type` + `tam` heuristic. |

`lib/products.ts` holds the exact-product catalog (`PRODUCT_CATALOG`) with the
product → team (segment) → customer-system map.

The default `mock` provider is unchanged (embedded fixtures); the ten tables back
the `SALESFORCE_PROVIDER=convex` path and are loaded by `/api/dev/seed`.

## Verdict (customer/TAM)

| Finding | Verdict |
|---|---|
| Current customer of the **exact** product being worked | **NOT WORKABLE** |
| Customer of a **different** product (same segment or not) | REVIEW |
| **TAM segment ≠ the worked segment** (e.g. TAM=Intacct, worked as X3), non-construction | REVIEW |
| **Former** customer of any product | REVIEW |
| Fuzzy-only match | REVIEW *(deterministic fixtures for now; real matcher deferred)* |
| No match | PASS → remaining checks |

Confirmed edge cases: a customer worked in a *different* segment stays **review**
(mismatch beats the customer block); a customer of a different exact product in
the *same* segment (BMS: worked Sage 300, owns Sage 100) is **review**. Block is
strictly the exact product.

### Wrong vertical

A construction-industry account worked under a non-CRE segment is the wrong
territory — it should never have been assigned. It surfaces as a **TAM/territory
failure** (blocks) via the existing TAM check row rather than a new row, so the
UI is unchanged. Outbound (BDR) only; the inbound lead audit has no vertical
step.

## ABM Account Nurture Status writes

Business rule: **blocked by de-dupe → the engine sets the status; anything that
lands in the worklist (workable/review) is left for the rep.** So the engine
writes a status only on a hard block, and only for de-dupe dispositions:

| Block reason | ABM status written |
|---|---|
| Duplicate account (exact domain) | `Duplicate Account` |
| Wrong vertical | `Incorrect Vertical` |
| Current customer (exact product / existing / TAM blank) | `Current Customer` |
| ROE / open-opp / DQ blocks | *(none — transient conflicts, not a disposition)* |

The write is applied in `app/api/workability/[accountId]/route.ts`, guarded so it
never clobbers a rep-set disposition: it only overwrites a blank status or one
the engine itself owns (`ENGINE_OWNED_ABM_STATUSES`), and is idempotent.

## Sourcing (from the audit SOPs)

The two motions differ; the CSVs in `dedupe-audit/` are authoritative.

| Check | GMO | Intacct SF | Fusion |
|---|---|---|---|
| Customer / product ownership | lead origin | ✓ | ✓ |
| Open opp · DQ opp | ✓ | ✓ (Intacct-SF products) | **— none** |
| Partner / VAR | ✓ | ✓ | ✓ |
| TAM / ownership / ROE activity | ✓ | — | — |

**Fusion has no opportunities or activity** — non-Intacct products' opps, DQ, and
ROE are all read from GMO. Fusion contributes only customer ownership and partner
relationships. Activity windows differ by motion (inbound 10-day, outbound
30-day); Sage Intacct Construction opps read Intacct SF (keyed on Intacct-SF
product).

## Showcase data

`lib/salesforce/mock/fixtures/three-system.ts` — seven dummy accounts, one per
verdict path (exact-product block, other-product review, former customer,
segment mismatch, wrong vertical, Intacct-SF open opp, clean), each replicating a
company matched across the three systems. Asserted in `three-system.test.ts`.

## Follow-ups

- Real fuzzy matcher (domain + name/geo) when real Intacct/Fusion exports land —
  matching is deterministic for now.
- Inbound-specific activity windows / archived-lead exception / Lead-History
  ownership are documented in the audit CSVs but not yet all wired.
