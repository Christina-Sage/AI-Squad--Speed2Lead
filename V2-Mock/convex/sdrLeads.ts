import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { sdrLeadFields } from "./validators";

function strip<T extends { _id: unknown; _creationTime: unknown }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("sdrLeads").collect();
    return rows.map(strip);
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await ctx.db
      .query("sdrLeads")
      .withIndex("by_business_id", (q) => q.eq("id", id))
      .first();
    return row ? strip(row) : null;
  },
});

export const replaceAll = mutation({
  args: { rows: v.array(v.object(sdrLeadFields)) },
  handler: async (ctx, { rows }) => {
    const existing = await ctx.db.query("sdrLeads").collect();
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)));
    await Promise.all(rows.map((r) => ctx.db.insert("sdrLeads", r)));
    return { inserted: rows.length };
  },
});
