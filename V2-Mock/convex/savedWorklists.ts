import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    id: v.string(),
    userId: v.string(),
    name: v.string(),
    source: v.union(v.string(), v.null()),
    accountIds: v.array(v.string()),
    expiresAt: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("savedWorklists", {
      ...args,
      createdAt: Date.now(),
      archivedAt: null,
    });
    return args.id;
  },
});

// Look up a user's list by its app-level id. Returns the Convex doc or null.
async function findOwned(ctx: MutationCtx, id: string, userId: string) {
  const doc = await ctx.db
    .query("savedWorklists")
    .withIndex("by_business_id", (q) => q.eq("id", id))
    .first();
  return doc && doc.userId === userId ? doc : null;
}

export const archive = mutation({
  args: { userId: v.string(), id: v.string() },
  handler: async (ctx, { userId, id }) => {
    const doc = await findOwned(ctx, id, userId);
    if (doc) await ctx.db.patch(doc._id, { archivedAt: Date.now() });
  },
});

export const reopen = mutation({
  args: { userId: v.string(), id: v.string() },
  handler: async (ctx, { userId, id }) => {
    const doc = await findOwned(ctx, id, userId);
    if (doc) await ctx.db.patch(doc._id, { archivedAt: null });
  },
});

export const remove = mutation({
  args: { userId: v.string(), id: v.string() },
  handler: async (ctx, { userId, id }) => {
    const doc = await findOwned(ctx, id, userId);
    if (doc) await ctx.db.delete(doc._id);
  },
});

// All of a user's saved worklists, newest-first. Status/progress/purge logic
// stays in lib/worklists/saved.ts.
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("savedWorklists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({
        id: r.id,
        name: r.name,
        source: r.source,
        accountIds: r.accountIds,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        archivedAt: r.archivedAt,
      }));
  },
});
