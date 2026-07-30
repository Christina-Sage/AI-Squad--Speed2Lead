import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const row = await ctx.db
      .query("accountOverrides")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .first();
    if (!row) return null;
    return {
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      abmNurtureStatus: row.abmNurtureStatus,
    };
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("accountOverrides").collect();
    return rows.map((r) => ({
      accountId: r.accountId,
      ownerId: r.ownerId,
      ownerName: r.ownerName,
      abmNurtureStatus: r.abmNurtureStatus,
    }));
  },
});

// Upsert on accountId — mirrors the former Drizzle onConflictDoUpdate.
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
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ownerId: args.ownerId,
        ownerName: args.ownerName,
        abmNurtureStatus: args.abmNurtureStatus,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("accountOverrides", { ...args, updatedAt: Date.now() });
    }
  },
});
