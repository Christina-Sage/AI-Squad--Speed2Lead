import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// A record counts as "worked" once it's been pushed to Outreach, marked Not a
// Fit, or archived. Kept in sync with lib/audit/worked.ts.
const WORKED_ACTIONS = ["PUSH_OUTREACH", "NOT_A_FIT", "ARCHIVE_LEAD"];

export const write = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLog", { ...args, createdAt: Date.now() });
  },
});

// Worked entries for a user, newest-first. `sinceMs` (optional) restricts to
// entries at/after that epoch-ms instant — used for the daily worked-today set.
export const workedByUser = query({
  args: { userId: v.string(), sinceMs: v.optional(v.number()) },
  handler: async (ctx, { userId, sinceMs }) => {
    const rows = await ctx.db
      .query("auditLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return rows
      .filter(
        (r) =>
          WORKED_ACTIONS.includes(r.action) &&
          (sinceMs === undefined || r.createdAt >= sinceMs),
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({
        accountId: r.accountId,
        action: r.action,
        reason: r.reason,
      }));
  },
});
