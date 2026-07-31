import { v } from "convex/values";

// Shared field validators for the CRM fixtures ported into Convex.
//
// These are used in two places so the shapes never drift:
//   1. `schema.ts` — `defineTable(<fields>)`.
//   2. The `replaceAll` seed mutations — `v.array(v.object(<fields>))`.
//
// Modelling rules (same convention as the persistence tables in schema.ts):
//   - `foo?: T`         -> v.optional(T)
//   - `foo: T | null`   -> v.union(T, v.null())
//   - `foo?: T | null`  -> v.optional(v.union(T, v.null()))
//   - narrow string unions (Product, AccountType, BuyingStage, PriorityGroup)
//     are stored as v.string(); the provider casts back to the union at the
//     read boundary. Keeping them loose avoids the schema rejecting a future
//     product/stage value before the TS union is updated.

export const accountFields = {
  // App-level Global Account ID (e.g. "0015Y00000ACME01"). Referenced in URLs,
  // cookies, and cross-record joins, so it is preserved as an indexed field
  // rather than relying on Convex's `_id`.
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
  campaigns: v.optional(
    v.array(v.object({ name: v.string(), date: v.string() })),
  ),
  abmNurtureStatus: v.union(v.string(), v.null()),
  lastActivityDate: v.union(v.string(), v.null()),
  intacct: v.object({
    hasOpenOpps: v.boolean(),
    openOppDetails: v.optional(
      v.array(
        v.object({
          name: v.string(),
          owner: v.string(),
          createdBy: v.optional(v.string()),
          stage: v.string(),
          createdDate: v.string(),
        }),
      ),
    ),
    existingCustomerFlag: v.optional(v.boolean()),
    sageId: v.optional(v.string()),
    shellAccountStatus: v.optional(v.string()),
    varStatus: v.optional(v.string()),
  }),
  fusion: v.optional(v.object({ partnerStatus: v.optional(v.string()) })),
  worklistHidden: v.optional(v.boolean()),
};

// Salesforce Lead records used for the ROE check (distinct from SDR worklist
// leads below). `product` is inherited from the account at bundle-assembly time
// and is not persisted here.
export const salesforceLeadFields = {
  id: v.string(),
  name: v.string(),
  title: v.string(),
  ownerId: v.string(),
  ownerName: v.string(),
  status: v.string(),
  accountId: v.string(),
  lastActivityDate: v.union(v.string(), v.null()),
};

export const contactFields = {
  id: v.string(),
  name: v.string(),
  title: v.string(),
  ownerId: v.string(),
  ownerName: v.string(),
  accountId: v.string(),
  lastActivityDate: v.union(v.string(), v.null()),
  // True for contacts created via "+ Add to Salesforce" on the work-it page.
  // Replaces the mock store's in-memory `addedContactNames` set — a persisted
  // contact row is the durable record of a research-sourced add.
  researchAdded: v.optional(v.boolean()),
};

export const opportunityFields = {
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

export const activityFields = {
  id: v.string(),
  accountId: v.string(),
  type: v.string(),
  date: v.string(),
  relatedToId: v.optional(v.string()),
};

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

// Work-it state that isn't a first-class CRM record: applied data-hygiene fields
// and the latest Outreach push, keyed by account (or lead) id. Added contacts
// live in the `contacts` table (researchAdded), so they aren't duplicated here.
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
