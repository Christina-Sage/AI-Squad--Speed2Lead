import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** Create a saved worklist; the caller supplies the external swl_ id. */
export const create = mutation({
  args: {
    extId: v.string(),
    userId: v.string(),
    name: v.string(),
    source: v.union(v.string(), v.null()),
    accountIds: v.array(v.string()),
    expiresAt: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("savedWorklists", { ...args, archivedAt: null });
  },
});

export const archive = mutation({
  args: { userId: v.string(), extId: v.string() },
  handler: async (ctx, { userId, extId }) => {
    const row = await ctx.db
      .query("savedWorklists")
      .withIndex("by_extId", (q) => q.eq("extId", extId))
      .unique();
    if (row && row.userId === userId) await ctx.db.patch(row._id, { archivedAt: Date.now() });
  },
});

export const reopen = mutation({
  args: { userId: v.string(), extId: v.string() },
  handler: async (ctx, { userId, extId }) => {
    const row = await ctx.db
      .query("savedWorklists")
      .withIndex("by_extId", (q) => q.eq("extId", extId))
      .unique();
    if (row && row.userId === userId) await ctx.db.patch(row._id, { archivedAt: null });
  },
});

export const del = mutation({
  args: { userId: v.string(), extId: v.string() },
  handler: async (ctx, { userId, extId }) => {
    const row = await ctx.db
      .query("savedWorklists")
      .withIndex("by_extId", (q) => q.eq("extId", extId))
      .unique();
    if (row && row.userId === userId) await ctx.db.delete(row._id);
  },
});

/**
 * All of a user's saved worklists, newest-first, as raw rows. Status/progress and
 * grace-period purging are derived by the caller (lib/worklists/saved.ts), which
 * already holds the workedEver set.
 */
export const listForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("savedWorklists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return rows.map((r) => ({
      id: r.extId,
      name: r.name,
      source: r.source ?? null,
      accountIds: r.accountIds,
      createdAt: r._creationTime,
      expiresAt: r.expiresAt ?? null,
      archivedAt: r.archivedAt ?? null,
    }));
  },
});
