import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  accountFields,
  activityFields,
  contactFields,
  opportunityFields,
  salesforceLeadFields,
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
  // CRM records (formerly the in-memory mock fixtures).
  //
  // These back the `convex` Salesforce provider (SALESFORCE_PROVIDER=convex).
  // Under the `mock` provider they are unused. Business ids (Global Account ID,
  // Lead ID, etc.) are preserved as indexed fields because URLs, cookies, and
  // cross-record joins reference them; Convex's `_id` is not used for joins.
  // Field shapes come from lib/salesforce/types.ts and lib/leads/types.ts via
  // ./validators so the schema, the seed mutations, and the app types stay in
  // lock-step.
  // ---------------------------------------------------------------------------
  accounts: defineTable(accountFields)
    .index("by_business_id", ["id"])
    .index("by_domain", ["domain"]),

  salesforceLeads: defineTable(salesforceLeadFields)
    .index("by_business_id", ["id"])
    .index("by_account", ["accountId"]),

  contacts: defineTable(contactFields)
    .index("by_business_id", ["id"])
    .index("by_account", ["accountId"]),

  opportunities: defineTable(opportunityFields)
    .index("by_business_id", ["id"])
    .index("by_account", ["accountId"]),

  activities: defineTable(activityFields).index("by_account", ["accountId"]),

  sdrLeads: defineTable(sdrLeadFields)
    .index("by_business_id", ["id"])
    .index("by_account", ["accountId"]),

  workItState: defineTable(workItStateFields).index("by_account", ["accountId"]),
});
