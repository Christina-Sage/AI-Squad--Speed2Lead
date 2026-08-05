import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  gmoAccountFields,
  gmoActivityFields,
  gmoContactFields,
  gmoLeadFields,
  gmoOpportunityFields,
  intacctAccountFields,
  intacctActivityFields,
  intacctContactFields,
  intacctOpportunityFields,
  fusionAccountFields,
  sdrLeadFields,
  workItStateFields,
} from "./validators";

// Convex schema, ported 1:1 from the former Drizzle/Postgres schema (db/schema.ts).
//
// Mapping notes:
// - Postgres `timestamp` columns become numbers (epoch milliseconds). We keep
//   explicit timestamp fields (createdAt/updatedAt/...) rather than relying on
//   Convex's built-in `_creationTime` so that the original Neon timestamps are
//   preserved verbatim on import — ordering/expiry logic reads these fields.
// - The `serial` primary key on audit_log is dropped; Convex assigns `_id`.
//   Nothing referenced that integer id.
// - `saved_worklists.id` and `account_overrides.accountId` are app-level string
//   keys (used in cookies/URLs and as the override key), so they are preserved
//   as regular indexed fields.
// - `jsonb` columns become native values (arrays/objects).
// - Nullable Postgres columns are modelled as `v.union(T, v.null())` so null is
//   stored explicitly, mirroring the source rows exactly.
export default defineSchema({
  auditLog: defineTable({
    createdAt: v.number(),

    userId: v.string(),
    userName: v.string(),
    team: v.string(),

    searchInput: v.string(),
    searchType: v.string(),

    accountId: v.union(v.string(), v.null()),
    domain: v.union(v.string(), v.null()),
    accountName: v.union(v.string(), v.null()),

    finalStatus: v.union(v.string(), v.null()),
    reason: v.union(v.string(), v.null()),
    reasonCodes: v.union(v.array(v.string()), v.null()),

    action: v.string(),
    assignmentDetails: v.union(v.record(v.string(), v.any()), v.null()),
  }).index("by_user", ["userId"]),

  savedWorklists: defineTable({
    // App-level id, e.g. "swl_<uuid>". Referenced by cookie/URL.
    id: v.string(),
    createdAt: v.number(),

    userId: v.string(),
    name: v.string(),
    source: v.union(v.string(), v.null()),
    accountIds: v.array(v.string()),

    expiresAt: v.union(v.number(), v.null()),
    archivedAt: v.union(v.number(), v.null()),
  })
    .index("by_user", ["userId"])
    .index("by_business_id", ["id"]),

  accountOverrides: defineTable({
    accountId: v.string(),
    ownerId: v.string(),
    ownerName: v.string(),
    abmNurtureStatus: v.union(v.string(), v.null()),
    updatedAt: v.number(),
  }).index("by_account", ["accountId"]),

  // Retained (unused): nothing reads or writes this in the app. Kept so that
  // existing Neon rows can be migrated without loss.
  capturedLeads: defineTable({
    id: v.string(),
    createdAt: v.number(),

    name: v.string(),
    title: v.string(),
    company: v.union(v.string(), v.null()),
    email: v.union(v.string(), v.null()),
    source: v.union(v.string(), v.null()),

    ownerName: v.string(),
    status: v.string(),
    priorityGroup: v.string(),
    product: v.string(),

    fit: v.number(),
    intent: v.number(),
    workability: v.number(),
    score: v.number(),
  }).index("by_business_id", ["id"]),

  // ---------------------------------------------------------------------------
  // The ten real source tables (three systems). These back the `convex`
  // Salesforce provider (SALESFORCE_PROVIDER=convex); under `mock` they are
  // unused. The GMO Global Account ID is the join key across systems and is
  // preserved as an indexed field. Field shapes come from ./validators;
  // lib/salesforce/source-tables.ts decomposes/reassembles the embedded Account.
  // ---------------------------------------------------------------------------

  // GMO Salesforce — system of record (leads originate here; accounts worked here).
  gmoAccounts: defineTable(gmoAccountFields)
    .index("by_business_id", ["id"])
    .index("by_domain", ["domain"]),
  gmoLeads: defineTable(gmoLeadFields)
    .index("by_business_id", ["id"])
    .index("by_account", ["accountId"])
    .index("by_domain", ["domain"]),
  gmoContacts: defineTable(gmoContactFields)
    .index("by_business_id", ["id"])
    .index("by_account", ["accountId"])
    .index("by_domain", ["domain"]),
  gmoOpportunities: defineTable(gmoOpportunityFields)
    .index("by_business_id", ["id"])
    .index("by_account", ["accountId"]),
  gmoActivities: defineTable(gmoActivityFields).index("by_account", ["accountId"]),

  // Intacct Salesforce — customers of Sage Intacct + Sage Intacct Construction.
  // Native IDs differ from GMO's; the `by_domain` index is the cross-instance
  // join key (match GMO ⇄ Intacct on normalized domain, not on accountId).
  intacctAccounts: defineTable(intacctAccountFields)
    .index("by_account", ["accountId"])
    .index("by_domain", ["domain"]),
  intacctContacts: defineTable(intacctContactFields)
    .index("by_business_id", ["id"])
    .index("by_account", ["accountId"])
    .index("by_domain", ["domain"]),
  intacctOpportunities: defineTable(intacctOpportunityFields).index("by_account", ["accountId"]),
  intacctActivities: defineTable(intacctActivityFields).index("by_account", ["accountId"]),

  // SAP Fusion — customer + partner ownership only (no opps, no activity).
  fusionAccounts: defineTable(fusionAccountFields)
    .index("by_account", ["accountId"])
    .index("by_domain", ["domain"]),

  sdrLeads: defineTable(sdrLeadFields)
    .index("by_business_id", ["id"])
    .index("by_account", ["accountId"]),

  workItState: defineTable(workItStateFields).index("by_account", ["accountId"]),
});
