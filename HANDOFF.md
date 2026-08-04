# Handoff — WorkIt V2: Convex + three-system de-dupe

**Status: the Convex + three-system rework is implemented and merged to `main`.**
What earlier drafts of this file described as "to be done" is now the shipped
code (PRs #86–#91). The remaining work is **deployment verification**, not
implementation — see [What's left](#whats-left) below.

## What's done

The three real source systems — **GMO Salesforce · Intacct Salesforce · SAP
Fusion** — are modelled as **10 Convex source tables**, with the confirmed
**product-aware** de-dupe verdict (exact-product current customer = block; any
other/former/fuzzy match = review). Verified on the current tree: `tsc` (app +
convex), `eslint`, and the full `vitest` suite pass.

| Piece | Where |
|---|---|
| 10-table three-system schema | `V2-Mock/convex/schema.ts` |
| Product → team → customer-system taxonomy (CRE split) | `V2-Mock/lib/products.ts` |
| Product-aware block/review verdict | `V2-Mock/lib/workability/customer-tam.ts` |
| Cross-system bundle assembly | `V2-Mock/lib/salesforce/source-tables.ts` |
| `SALESFORCE_PROVIDER=convex` switch | `V2-Mock/lib/salesforce/provider.ts` |
| Seed (all 10 tables + sdrLeads) | `V2-Mock/app/api/dev/seed/route.ts` |
| Deployment diagnostics | `V2-Mock/app/api/health/route.ts` |

## What's left

Deployment is env-var-driven, so the repo alone can't confirm production is
actually running on Convex. The steps and the sharp edges are in
[`V2-Mock/DEPLOY.md`](V2-Mock/DEPLOY.md); in short:

1. Set the Vercel env vars — `SALESFORCE_PROVIDER=convex` is the real switch
   (without it the deployed app silently uses the in-memory mock).
2. Seed prod **once** (deploy pushes schema+functions, not rows), then lock the
   seed route back down.
3. Verify with **`GET /api/health`** — it reports the active provider and
   per-table row counts, so you can confirm connected-and-seeded from a browser.

One open business question remains: `docs/DEDUPE-CONVEX-HANDOFF.md` §7.4 (opp/DQ/
activity sourcing for `Sage Intacct Construction`). The code assumes "reads
Intacct SF"; confirm or correct.

## Reference

- Full spec, verdict logic, and worked examples:
  [`V2-Mock/docs/DEDUPE-CONVEX-HANDOFF.md`](V2-Mock/docs/DEDUPE-CONVEX-HANDOFF.md)
- Visual model (self-contained HTML, open in a browser):
  [`V2-Mock/docs/dedupe-model.html`](V2-Mock/docs/dedupe-model.html)
- Backend/persistence reference: [`V2-Mock/docs/BACKEND.md`](V2-Mock/docs/BACKEND.md)
