import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { gmoContactFields } from "./validators";

function strip<T extends { _id: unknown; _creationTime: unknown }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

export const byAccount = query({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) =>
    (
      await ctx.db
        .query("gmoContacts")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect()
    ).map(strip),
});

// Insert a single research-sourced contact (the "+ Add to Salesforce" action).
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
    const row = { ...args, lastActivityDate: null, researchAdded: true };
    await ctx.db.insert("gmoContacts", row);
    return row;
  },
});

export const replaceAll = mutation({
  args: { rows: v.array(v.object(gmoContactFields)) },
  handler: async (ctx, { rows }) => {
    const existing = await ctx.db.query("gmoContacts").collect();
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)));
    await Promise.all(rows.map((r) => ctx.db.insert("gmoContacts", r)));
    return { inserted: rows.length };
  },
});
