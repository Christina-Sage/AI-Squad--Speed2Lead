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

// Seeds example saved worklists for a user (demo data). Idempotent: each list
// is keyed by its business id, so re-seeding replaces the existing example row
// rather than duplicating it, and it never touches lists the user created
// themselves (those carry random uuids). createdAt/expiresAt are computed by the
// caller (the seed route) so this mutation stays free of wall-clock reads.
export const seedExamples = mutation({
  args: {
    userId: v.string(),
    worklists: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        source: v.union(v.string(), v.null()),
        accountIds: v.array(v.string()),
        createdAt: v.number(),
        expiresAt: v.union(v.number(), v.null()),
      }),
    ),
  },
  handler: async (ctx, { userId, worklists }) => {
    for (const wl of worklists) {
      const existing = await ctx.db
        .query("savedWorklists")
        .withIndex("by_business_id", (q) => q.eq("id", wl.id))
        .collect();
      await Promise.all(
        existing.filter((d) => d.userId === userId).map((d) => ctx.db.delete(d._id)),
      );
      await ctx.db.insert("savedWorklists", {
        id: wl.id,
        userId,
        name: wl.name,
        source: wl.source,
        accountIds: wl.accountIds,
        createdAt: wl.createdAt,
        expiresAt: wl.expiresAt,
        archivedAt: null,
      });
    }
    return { inserted: worklists.length };
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
