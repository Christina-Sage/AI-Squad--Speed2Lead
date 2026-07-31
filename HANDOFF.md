# Handoff — WorkIt V2: Convex + three-system de-dupe

**For Monday pickup.** This branch (`claude/sample-data-convex-migration-qrczr7`)
carries a confirmed spec + a first-pass implementation for moving WorkIt V2's
sample data into **Convex** and restructuring it to the real **three-system,
product-aware de-dupe model** (GMO Salesforce · Intacct Salesforce · SAP Fusion).

**Start here:**

1. **Read** [`V2-Mock/docs/DEDUPE-CONVEX-HANDOFF.md`](V2-Mock/docs/DEDUPE-CONVEX-HANDOFF.md)
   — the full spec, implementation runbook, and GitHub + Vercel deployment steps.
2. **Open** [`V2-Mock/docs/dedupe-model.html`](V2-Mock/docs/dedupe-model.html) in
   a browser — the visual model (self-contained, no build step).
3. **Note:** the Convex code already on this branch models the **old**
   single-account shape and must be **reworked** to the three-system model in the
   handoff (§1 and §3 explain exactly what changes and what's reusable).

Existing backend reference: [`V2-Mock/docs/BACKEND.md`](V2-Mock/docs/BACKEND.md).
