import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** One account's override, or null when none exists. */
export const get = query({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const row = await ctx.db
      .query("accountOverrides")
      .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
      .unique();
    if (!row) return null;
    return {
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      abmNurtureStatus: row.abmNurtureStatus ?? null,
    };
  },
});

/** Every override, as [accountId, override] pairs (the caller builds the Map). */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("accountOverrides").collect();
    return rows.map((r) => ({
      accountId: r.accountId,
      ownerId: r.ownerId,
      ownerName: r.ownerName,
      abmNurtureStatus: r.abmNurtureStatus ?? null,
    }));
  },
});

/** Upsert an override, keyed by accountId (replaces the SQL onConflictDoUpdate). */
export const set = mutation({
  args: {
    accountId: v.string(),
    ownerId: v.string(),
    ownerName: v.string(),
    abmNurtureStatus: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("accountOverrides")
      .withIndex("by_accountId", (q) => q.eq("accountId", args.accountId))
      .unique();
    const patch = {
      ownerId: args.ownerId,
      ownerName: args.ownerName,
      abmNurtureStatus: args.abmNurtureStatus,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("accountOverrides", { accountId: args.accountId, ...patch });
    }
  },
});
