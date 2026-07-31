import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { accountFields } from "./validators";

// Strip Convex's system fields so callers get the plain Account shape they
// stored. The provider casts the narrow string-union fields (product, type, …)
// back to their TS unions at the read boundary.
function strip<T extends { _id: unknown; _creationTime: unknown }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("accounts").collect();
    return rows.map(strip);
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await ctx.db
      .query("accounts")
      .withIndex("by_business_id", (q) => q.eq("id", id))
      .first();
    return row ? strip(row) : null;
  },
});

// Assign the account to a user and flip ABM status to "Working". Patches the
// authoritative row directly — no separate overrides table under this provider.
export const assign = mutation({
  args: {
    id: v.string(),
    ownerId: v.string(),
    ownerName: v.string(),
    abmNurtureStatus: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { id, ownerId, ownerName, abmNurtureStatus }) => {
    const row = await ctx.db
      .query("accounts")
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
      .query("accounts")
      .withIndex("by_business_id", (q) => q.eq("id", id))
      .first();
    if (!row) throw new Error(`Account ${id} not found`);
    await ctx.db.patch(row._id, { abmNurtureStatus });
    return strip({ ...row, abmNurtureStatus });
  },
});

// Seed helper: wipe the table and load the provided rows. Idempotent — safe to
// re-run. Used by the dev seed route to load the fixtures into Convex.
export const replaceAll = mutation({
  args: { rows: v.array(v.object(accountFields)) },
  handler: async (ctx, { rows }) => {
    const existing = await ctx.db.query("accounts").collect();
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)));
    await Promise.all(rows.map((r) => ctx.db.insert("accounts", r)));
    return { inserted: rows.length };
  },
});
