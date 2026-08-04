import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { gmoAccountFields } from "./validators";

// Strip Convex system fields so callers get the plain stored shape. The provider
// re-narrows string-union fields (product, type, …) at the read boundary.
function strip<T extends { _id: unknown; _creationTime: unknown }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

export const list = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("gmoAccounts").collect()).map(strip),
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await ctx.db
      .query("gmoAccounts")
      .withIndex("by_business_id", (q) => q.eq("id", id))
      .first();
    return row ? strip(row) : null;
  },
});

// Assign the account to a user and flip ABM status to "Working".
export const assign = mutation({
  args: {
    id: v.string(),
    ownerId: v.string(),
    ownerName: v.string(),
    abmNurtureStatus: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { id, ownerId, ownerName, abmNurtureStatus }) => {
    const row = await ctx.db
      .query("gmoAccounts")
      .withIndex("by_business_id", (q) => q.eq("id", id))
      .first();
    if (!row) throw new Error(`Account ${id} not found`);
    await ctx.db.patch(row._id, { ownerId, ownerName, abmNurtureStatus });
    return strip({ ...row, ownerId, ownerName, abmNurtureStatus });
  },
});

export const setAbmStatus = mutation({
  args: { id: v.string(), abmNurtureStatus: v.union(v.string(), v.null()) },
  handler: async (ctx, { id, abmNurtureStatus }) => {
    const row = await ctx.db
      .query("gmoAccounts")
      .withIndex("by_business_id", (q) => q.eq("id", id))
      .first();
    if (!row) throw new Error(`Account ${id} not found`);
    await ctx.db.patch(row._id, { abmNurtureStatus });
    return strip({ ...row, abmNurtureStatus });
  },
});

// Seed helper: wipe the table and load the provided rows. Idempotent.
export const replaceAll = mutation({
  args: { rows: v.array(v.object(gmoAccountFields)) },
  handler: async (ctx, { rows }) => {
    const existing = await ctx.db.query("gmoAccounts").collect();
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)));
    await Promise.all(rows.map((r) => ctx.db.insert("gmoAccounts", r)));
    return { inserted: rows.length };
  },
});
