import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { gmoOpportunityFields } from "./validators";

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
        .query("gmoOpportunities")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect()
    ).map(strip),
});

export const replaceAll = mutation({
  args: { rows: v.array(v.object(gmoOpportunityFields)) },
  handler: async (ctx, { rows }) => {
    const existing = await ctx.db.query("gmoOpportunities").collect();
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)));
    await Promise.all(rows.map((r) => ctx.db.insert("gmoOpportunities", r)));
    return { inserted: rows.length };
  },
});
