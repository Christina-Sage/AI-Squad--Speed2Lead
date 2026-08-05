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

// Seeds "worked" audit entries for demo data — used to make the example Saved
// Worklists look pre-worked in the picker. Marked with searchType "seed" so it's
// idempotent (prior seeded rows are cleared first) and never disturbs real
// worked history. `createdAt` is supplied by the caller (kept in the past, so
// these don't count toward the daily worked-today set).
export const seedWorked = mutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    team: v.string(),
    createdAt: v.number(),
    accounts: v.array(
      v.object({ accountId: v.string(), accountName: v.union(v.string(), v.null()) }),
    ),
  },
  handler: async (ctx, { userId, userName, team, createdAt, accounts }) => {
    const existing = await ctx.db
      .query("auditLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(
      existing.filter((r) => r.searchType === "seed").map((r) => ctx.db.delete(r._id)),
    );
    for (const a of accounts) {
      await ctx.db.insert("auditLog", {
        createdAt,
        userId,
        userName,
        team,
        searchInput: "seed:example-worklist",
        searchType: "seed",
        accountId: a.accountId,
        domain: null,
        accountName: a.accountName,
        finalStatus: "WORKABLE",
        reason: null,
        reasonCodes: null,
        action: "PUSH_OUTREACH",
        assignmentDetails: null,
      });
    }
    return { inserted: accounts.length };
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
