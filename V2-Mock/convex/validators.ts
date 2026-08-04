import { v } from "convex/values";

// Shared field validators for the ten real source tables (Convex-backed).
//
// Used in two places so the shapes never drift:
//   1. `schema.ts` — `defineTable(<fields>)`.
//   2. The `replaceAll` seed mutations — `v.array(v.object(<fields>))`.
//
// The app's UI reads an embedded `Account` (one account with `intacct`/`fusion`
// sub-objects). These tables store that data split across the three source
// systems; lib/salesforce/source-tables.ts decomposes the fixtures into these
// rows and reassembles them for the provider. See that module for the mapping.
//
// Modelling rules (same convention as the persistence tables in schema.ts):
//   - `foo?: T`         -> v.optional(T)
//   - `foo: T | null`   -> v.union(T, v.null())
//   - narrow string unions (Product, ExactProduct, status, …) are stored as
//     v.string(); the provider re-narrows at the read boundary so the schema
//     never rejects a new product/status value before its TS union is updated.

// ── GMO Salesforce — system of record ──────────────────────────────────────

// GMO account = the embedded Account minus the reassembled sub-objects
// (`intacct` / `fusion` / `customerProducts`), which live in the other systems.
export const gmoAccountFields = {
  // App-level Global Account ID (e.g. "0015Y00000ACME01"). Indexed and used as
  // the join key across all three systems, so preserved rather than using `_id`.
  id: v.string(),
  name: v.string(),
  domain: v.string(),
  ownerId: v.string(),
  ownerName: v.string(),
  industry: v.string(),
  type: v.string(),
  product: v.string(),
  tam: v.union(v.string(), v.null()),
  parentAccount: v.optional(v.union(v.string(), v.null())),
  location: v.optional(v.union(v.string(), v.null())),
  buyingStage: v.optional(v.union(v.string(), v.null())),
  rating: v.optional(v.union(v.string(), v.null())),
  campaigns: v.optional(v.array(v.object({ name: v.string(), date: v.string() }))),
  abmNurtureStatus: v.union(v.string(), v.null()),
  lastActivityDate: v.union(v.string(), v.null()),
  // Exact product being worked (full name, for name-collision safety).
  workedProduct: v.optional(v.string()),
  worklistHidden: v.optional(v.boolean()),
};

export const gmoLeadFields = {
  id: v.string(),
  name: v.string(),
  title: v.string(),
  ownerId: v.string(),
  ownerName: v.string(),
  status: v.string(),
  accountId: v.string(),
  lastActivityDate: v.union(v.string(), v.null()),
};

export const gmoContactFields = {
  id: v.string(),
  name: v.string(),
  title: v.string(),
  ownerId: v.string(),
  ownerName: v.string(),
  accountId: v.string(),
  lastActivityDate: v.union(v.string(), v.null()),
  // True for contacts created via "+ Add to Salesforce" on the work-it page.
  researchAdded: v.optional(v.boolean()),
};

export const gmoOpportunityFields = {
  id: v.string(),
  name: v.string(),
  accountId: v.string(),
  ownerId: v.string(),
  ownerName: v.string(),
  createdBy: v.optional(v.string()),
  stage: v.string(),
  isClosed: v.boolean(),
  createdDate: v.string(),
  furthestStage: v.optional(v.string()),
  movedToDiscoveryDate: v.optional(v.union(v.string(), v.null())),
  closedDate: v.optional(v.union(v.string(), v.null())),
  disqualification: v.optional(
    v.object({
      reason: v.string(),
      qualificationNotes: v.optional(v.string()),
      problems: v.optional(v.string()),
      nextSteps: v.optional(v.string()),
    }),
  ),
};

export const gmoActivityFields = {
  id: v.string(),
  accountId: v.string(),
  type: v.string(),
  date: v.string(),
  relatedToId: v.optional(v.string()),
};

// ── Intacct Salesforce — Sage Intacct + Sage Intacct Construction customers ──

// A product a company owns in a system (current or former).
const ownedProduct = v.object({ product: v.string(), status: v.string() });

export const intacctAccountFields = {
  // Join key — the GMO Global Account ID.
  accountId: v.string(),
  existingCustomerFlag: v.optional(v.boolean()),
  sageId: v.optional(v.string()),
  shellAccountStatus: v.optional(v.string()),
  varStatus: v.optional(v.string()),
  products: v.array(ownedProduct),
};

export const intacctContactFields = gmoContactFields;

export const intacctOpportunityFields = {
  accountId: v.string(),
  name: v.string(),
  owner: v.string(),
  createdBy: v.optional(v.string()),
  stage: v.string(),
  createdDate: v.string(),
  isClosed: v.boolean(),
};

export const intacctActivityFields = gmoActivityFields;

// ── SAP Fusion — customer + partner ownership only (no opps, no activity) ────

export const fusionAccountFields = {
  accountId: v.string(),
  partnerStatus: v.optional(v.string()),
  products: v.array(ownedProduct),
};

// ── Unchanged non-CRM records ────────────────────────────────────────────────

export const sdrLeadFields = {
  id: v.string(),
  name: v.string(),
  title: v.string(),
  accountId: v.union(v.string(), v.null()),
  ownerName: v.string(),
  status: v.string(),
  priorityGroup: v.string(),
  product: v.string(),
  industry: v.optional(v.union(v.string(), v.null())),
  fit: v.number(),
  intent: v.number(),
  workability: v.number(),
  score: v.number(),
  company: v.optional(v.union(v.string(), v.null())),
  email: v.optional(v.union(v.string(), v.null())),
  source: v.optional(v.union(v.string(), v.null())),
  createdAt: v.optional(v.union(v.string(), v.null())),
};

export const outreachPushValidator = v.object({
  sequence: v.string(),
  contactNames: v.array(v.string()),
  pushedBy: v.string(),
  pushedAt: v.string(),
});

export const workItStateFields = {
  accountId: v.string(),
  appliedHygieneFields: v.array(v.string()),
  outreachPush: v.union(outreachPushValidator, v.null()),
};
