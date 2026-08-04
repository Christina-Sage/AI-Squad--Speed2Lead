import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { intacctOpportunityFields } from "./validators";

function strip<T extends { _id: unknown; _creationTime: unknown }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

export const list = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("intacctOpportunities").collect()).map(strip),
});

export const byAccount = query({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) =>
    (
      await ctx.db
        .query("intacctOpportunities")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect()
    ).map(strip),
});

export const replaceAll = mutation({
  args: { rows: v.array(v.object(intacctOpportunityFields)) },
  handler: async (ctx, { rows }) => {
    const existing = await ctx.db.query("intacctOpportunities").collect();
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)));
    await Promise.all(rows.map((r) => ctx.db.insert("intacctOpportunities", r)));
    return { inserted: rows.length };
  },
});
