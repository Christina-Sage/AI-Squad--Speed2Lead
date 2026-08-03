import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { contactFields } from "./validators";

function strip<T extends { _id: unknown; _creationTime: unknown }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

export const byAccount = query({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const rows = await ctx.db
      .query("contacts")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    return rows.map(strip);
  },
});

// Create a research-sourced contact ("+ Add to Salesforce"). Persisted with
// researchAdded=true and no last-activity date (so it can't trip ROE).
export const insert = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    title: v.string(),
    ownerId: v.string(),
    ownerName: v.string(),
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = { ...args, lastActivityDate: null, researchAdded: true };
    await ctx.db.insert("contacts", doc);
    return doc;
  },
});

export const replaceAll = mutation({
  args: { rows: v.array(v.object(contactFields)) },
  handler: async (ctx, { rows }) => {
    const existing = await ctx.db.query("contacts").collect();
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)));
    await Promise.all(rows.map((r) => ctx.db.insert("contacts", r)));
    return { inserted: rows.length };
  },
});
