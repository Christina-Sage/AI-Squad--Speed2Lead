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

// ── Cross-system matching (GMO SF ⇄ Intacct SF ⇄ Fusion) ────────────────────
//
// The per-system record IDs are NOT shared: an account in GMO SF and the same
// company in Intacct SF have different native IDs. Cross-instance matching is
// therefore done on business attributes, not on `accountId`. The intended match
// key priority (strongest first) is:
//   1. `domain`  — normalized email/website domain (e.g. "acme.com"). Best key.
//   2. `website` — raw website URL, when no clean domain is available.
//   3. `company` — normalized company/account name. Weakest; fuzzy, last resort.
// These are added as optional match fields on the tables that need to be joined
// across instances. `domain` is the field to INDEX and match on; `website` /
// `company` / `email` are kept raw for display, audit, and fallback matching.
const matchKeyFields = {
  // Company / account name, normalized for matching. On person-level tables
  // (Lead/Contact) this is the ORGANIZATION name, distinct from `name` (person).
  company: v.optional(v.union(v.string(), v.null())),
  // Raw website URL as stored in the source system (e.g. "https://acme.com").
  website: v.optional(v.union(v.string(), v.null())),
  // Normalized match domain derived from email/website (e.g. "acme.com"). This
  // is the indexed cross-instance join key.
  domain: v.optional(v.union(v.string(), v.null())),
};

// Postal address, split into the components the source systems export. Account-
// level only — used for the `company name + address` fallback match when two
// records share no domain. All optional so existing rows/seeds are unaffected.
const addressFields = {
  address1: v.optional(v.union(v.string(), v.null())),
  address2: v.optional(v.union(v.string(), v.null())),
  address3: v.optional(v.union(v.string(), v.null())),
  city: v.optional(v.union(v.string(), v.null())),
  stateProvince: v.optional(v.union(v.string(), v.null())),
  country: v.optional(v.union(v.string(), v.null())),
};

// ── GMO Salesforce — system of record ──────────────────────────────────────

// GMO account = the embedded Account minus the reassembled sub-objects
// (`intacct` / `fusion` / `customerProducts`), which live in the other systems.
export const gmoAccountFields = {
  // App-level Global Account ID (e.g. "0015Y00000ACME01"). Native to GMO SF and
  // NOT shared with Intacct SF / Fusion — those systems match on `domain` (see
  // matchKeyFields), not on this id. Indexed, so preserved rather than using `_id`.
  id: v.string(),
  name: v.string(),
  // Normalized match domain (also the cross-instance join key for accounts).
  domain: v.string(),
  // Raw website URL, when it differs from the bare `domain`.
  website: v.optional(v.union(v.string(), v.null())),
  // Structured postal address (fallback match component).
  ...addressFields,
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
  // Person name. Company name lives in `company` (see matchKeyFields).
  name: v.string(),
  title: v.string(),
  ownerId: v.string(),
  ownerName: v.string(),
  status: v.string(),
  // Intra-instance link to the GMO account this lead belongs to.
  accountId: v.string(),
  lastActivityDate: v.union(v.string(), v.null()),
  // Person email; also the source for the normalized `domain` match key.
  email: v.optional(v.union(v.string(), v.null())),
  // company / website / domain — cross-instance match keys.
  ...matchKeyFields,
};

export const gmoContactFields = {
  id: v.string(),
  // Person name. Company name lives in `company` (see matchKeyFields).
  name: v.string(),
  title: v.string(),
  ownerId: v.string(),
  ownerName: v.string(),
  // Intra-instance link to the account this contact belongs to. NOTE: when this
  // shape is reused for Intacct contacts, `accountId` is the INTACCT account id,
  // not a GMO id — cross-instance joins go through `domain`, never this field.
  accountId: v.string(),
  lastActivityDate: v.union(v.string(), v.null()),
  // True for contacts created via "+ Add to Salesforce" on the work-it page.
  researchAdded: v.optional(v.boolean()),
  // Person email; also the source for the normalized `domain` match key.
  email: v.optional(v.union(v.string(), v.null())),
  // company / website / domain — cross-instance match keys.
  ...matchKeyFields,
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
  // TRANSITIONAL: still carries the GMO account id, because the provider join
  // (convex-provider.ts) currently matches Intacct→GMO on `accountId === gmo.id`.
  // The instance's TRUE, distinct native id is `nativeId`; the crosswalk
  // (accountResolution) links the two. Once the join moves to the crosswalk this
  // becomes `nativeId` and the GMO linkage lives only in accountResolution.
  accountId: v.string(),
  // Intacct SF's own native account id — distinct from the GMO id. What the
  // resolver records in the crosswalk for this system.
  nativeId: v.optional(v.string()),
  existingCustomerFlag: v.optional(v.boolean()),
  sageId: v.optional(v.string()),
  shellAccountStatus: v.optional(v.string()),
  varStatus: v.optional(v.string()),
  products: v.array(ownedProduct),
  // Account name + cross-instance match keys (company / website / domain). These
  // are what link an Intacct account back to its GMO counterpart.
  ...matchKeyFields,
  // Structured postal address (fallback match component).
  ...addressFields,
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
  // TRANSITIONAL: still the GMO account id (current provider join key); see the
  // note on intacctAccountFields.accountId. The true native id is `nativeId`.
  accountId: v.string(),
  // Fusion's own native account id — 10 digits, "400" + 7 (isFusionAccountId).
  nativeId: v.optional(v.string()),
  partnerStatus: v.optional(v.string()),
  products: v.array(ownedProduct),
  // Account name + cross-instance match keys (company / website / domain).
  ...matchKeyFields,
  // Structured postal address (fallback match component).
  ...addressFields,
};

// ── Cross-instance resolution (the crosswalk / resolution table) ─────────────
//
// Persisted output of the match resolver. Because per-system account IDs are NOT
// shared, this table records which native account IDs — across GMO / Intacct /
// Fusion — resolve to the same real-world company. Each company is a cluster
// keyed by `entityKey`; a cluster may hold 1..n accounts per system (the
// "1 or many" case that drives different dedupe / ROE rules). Rows are evidence,
// not verdicts: `status` carries them through candidate → confirmed / rejected.
//
// Match key priority (populated by the resolver, not this schema):
//   1. `domain`          — normalized email domain (post-`@`) / website. Best.
//   2. company + address — fallback when no shared domain exists.
//   3. Fusion `accountId` shape (^400\d+$) is a Fusion-side sanity signal.
export const accountResolutionInsertFields = {
  // Canonical cluster key. The normalized domain when a domain match exists;
  // otherwise a company+address token. Rows sharing this are the same org.
  entityKey: v.string(),
  // Source instance — "gmo" | "intacct" | "fusion". Stored as a string per the
  // house convention (re-narrowed at the read boundary), not a literal union.
  system: v.string(),
  // The account's NATIVE id within `system`. Not shared across systems.
  accountId: v.string(),
  // Normalized match domain (email post-`@` / website) for this record, if any.
  domain: v.union(v.string(), v.null()),
  // How this row was matched into the cluster: "email_domain" | "website_domain"
  // | "company_address" | "fusion_id" | "manual".
  matchMethod: v.string(),
  // Match strength driving the applicable rule: "high" | "medium" | "low".
  confidence: v.string(),
  // Review lifecycle: "candidate" | "confirmed" | "rejected".
  status: v.string(),
};

// Full stored shape = business fields + server-stamped timestamps.
export const accountResolutionFields = {
  ...accountResolutionInsertFields,
  createdAt: v.number(),
  updatedAt: v.number(),
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
