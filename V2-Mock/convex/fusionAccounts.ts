import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { fusionAccountFields } from "./validators";

// SAP Fusion holds customer + partner ownership only — no opportunities or
// activity tables exist here (those checks read GMO for non-Intacct products).
function strip<T extends { _id: unknown; _creationTime: unknown }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

export const list = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("fusionAccounts").collect()).map(strip),
});

export const byAccount = query({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const row = await ctx.db
      .query("fusionAccounts")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .first();
    return row ? strip(row) : null;
  },
});

export const replaceAll = mutation({
  args: { rows: v.array(v.object(fusionAccountFields)) },
  handler: async (ctx, { rows }) => {
    const existing = await ctx.db.query("fusionAccounts").collect();
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)));
    await Promise.all(rows.map((r) => ctx.db.insert("fusionAccounts", r)));
    return { inserted: rows.length };
  },
});
