import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex schema — the persistence layer that replaced Neon/Postgres (Drizzle).
 * Three tables mirror the former SQL schema (see db/schema.ts, kept for
 * reference/migration history but no longer used at runtime):
 *
 *   accountOverrides — "Assign to Me" / ABM-status overrides on top of the
 *                      in-memory mock fixtures, keyed by the SF account id.
 *   auditLog         — every rep action (search, assign, push, not-a-fit, …);
 *                      worked-state is derived from it, so it needs no own table.
 *   savedWorklists   — a rep's saved campaign lists, referenced by an external
 *                      `extId` (swl_…) that the UI/cookies use, not the Convex _id.
 *
 * Convex supplies `_id` and `_creationTime` (ms) automatically; nullable SQL
 * columns become optional fields (undefined instead of NULL). `_creationTime`
 * stands in for the former `created_at`.
 */
export default defineSchema({
  accountOverrides: defineTable({
    accountId: v.string(),
    ownerId: v.string(),
    ownerName: v.string(),
    abmNurtureStatus: v.optional(v.union(v.string(), v.null())),
    updatedAt: v.number(),
  }).index("by_accountId", ["accountId"]),

  auditLog: defineTable({
    userId: v.string(),
    userName: v.string(),
    team: v.string(),
    searchInput: v.string(),
    searchType: v.string(),
    accountId: v.optional(v.union(v.string(), v.null())),
    domain: v.optional(v.union(v.string(), v.null())),
    accountName: v.optional(v.union(v.string(), v.null())),
    finalStatus: v.optional(v.union(v.string(), v.null())),
    reason: v.optional(v.union(v.string(), v.null())),
    reasonCodes: v.optional(v.union(v.array(v.string()), v.null())),
    action: v.string(),
    assignmentDetails: v.optional(v.union(v.any(), v.null())),
  }).index("by_user", ["userId"]),

  savedWorklists: defineTable({
    extId: v.string(),
    userId: v.string(),
    name: v.string(),
    source: v.optional(v.union(v.string(), v.null())),
    accountIds: v.array(v.string()),
    expiresAt: v.optional(v.union(v.number(), v.null())),
    archivedAt: v.optional(v.union(v.number(), v.null())),
  })
    .index("by_extId", ["extId"])
    .index("by_user", ["userId"]),
});
