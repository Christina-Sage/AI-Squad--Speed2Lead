import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// A record counts as "worked" once pushed to Outreach, marked Not a Fit, or
// archived. All three live in the audit log, so worked-state needs no own table.
const WORKED_ACTIONS = ["PUSH_OUTREACH", "NOT_A_FIT", "ARCHIVE_LEAD"];

const nn = <T,>(x: T | null | undefined): T | null => (x === undefined ? null : (x as T | null));

/** Append an audit-log entry. `_creationTime` stands in for the old created_at. */
export const write = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLog", args);
  },
});

/**
 * Today's worked accounts for a user: worked-action rows created on/after
 * `sinceMs` (local midnight, computed by the caller), newest-first, one entry
 * per account (most recent wins).
 */
export const workedToday = query({
  args: { userId: v.string(), sinceMs: v.number() },
  handler: async (ctx, { userId, sinceMs }) => {
    const rows = await ctx.db
      .query("auditLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    const out: { accountId: string; outcome: "pushed" | "not_fit" | "archived"; reason: string | null }[] =
      [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (row._creationTime < sinceMs) continue;
      if (!WORKED_ACTIONS.includes(row.action)) continue;
      const accountId = nn(row.accountId);
      if (!accountId || seen.has(accountId)) continue;
      seen.add(accountId);
      out.push({
        accountId,
        outcome:
          row.action === "NOT_A_FIT" ? "not_fit" : row.action === "ARCHIVE_LEAD" ? "archived" : "pushed",
        reason: nn(row.reason),
      });
    }
    return out;
  },
});

/** Every account this user has ever worked (lifetime), across all days. */
export const workedAccountIds = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("auditLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const ids = new Set<string>();
    for (const row of rows) {
      if (WORKED_ACTIONS.includes(row.action) && row.accountId) ids.add(row.accountId);
    }
    return [...ids];
  },
});
