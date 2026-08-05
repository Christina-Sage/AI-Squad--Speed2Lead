import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { accountResolutionInsertFields } from "./validators";

// The cross-instance crosswalk. Per-system account IDs are not shared, so these
// rows record which native GMO / Intacct / Fusion account IDs resolve to the
// same company. Written by the match resolver; read by the account-assembly join
// and the review queue. See convex/validators.ts for the field semantics.

function strip<T extends { _id: unknown; _creationTime: unknown }>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

export const list = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("accountResolution").collect()).map(strip),
});

/** All rows in one cluster — every system's account IDs for the same company. */
export const byEntity = query({
  args: { entityKey: v.string() },
  handler: async (ctx, { entityKey }) =>
    (
      await ctx.db
        .query("accountResolution")
        .withIndex("by_entity", (q) => q.eq("entityKey", entityKey))
        .collect()
    ).map(strip),
});

/** Reverse lookup: what does a specific source record resolve to. */
export const bySystemAccount = query({
  args: { system: v.string(), accountId: v.string() },
  handler: async (ctx, { system, accountId }) =>
    (
      await ctx.db
        .query("accountResolution")
        .withIndex("by_system_account", (q) => q.eq("system", system).eq("accountId", accountId))
        .collect()
    ).map(strip),
});

/** All rows sharing a normalized match domain. */
export const byDomain = query({
  args: { domain: v.union(v.string(), v.null()) },
  handler: async (ctx, { domain }) =>
    (
      await ctx.db
        .query("accountResolution")
        .withIndex("by_domain", (q) => q.eq("domain", domain))
        .collect()
    ).map(strip),
});

/** The review queue — e.g. status = "candidate". */
export const byStatus = query({
  args: { status: v.string() },
  handler: async (ctx, { status }) =>
    (
      await ctx.db
        .query("accountResolution")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect()
    ).map(strip),
});

/**
 * Bulk-replace the whole crosswalk with a fresh resolver run. Timestamps are
 * server-stamped (createdAt = updatedAt = now) rather than taken from the caller,
 * mirroring accountOverrides.set.
 */
export const replaceAll = mutation({
  args: { rows: v.array(v.object(accountResolutionInsertFields)) },
  handler: async (ctx, { rows }) => {
    const now = Date.now();
    const existing = await ctx.db.query("accountResolution").collect();
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)));
    await Promise.all(
      rows.map((r) => ctx.db.insert("accountResolution", { ...r, createdAt: now, updatedAt: now })),
    );
    return { inserted: rows.length };
  },
});

/**
 * Move one link through review (confirm / reject / re-open) without rewriting the
 * whole table. Targets the unique (system, accountId, entityKey) link.
 */
export const setStatus = mutation({
  args: {
    system: v.string(),
    accountId: v.string(),
    entityKey: v.string(),
    status: v.string(),
  },
  handler: async (ctx, { system, accountId, entityKey, status }) => {
    const matches = await ctx.db
      .query("accountResolution")
      .withIndex("by_system_account", (q) => q.eq("system", system).eq("accountId", accountId))
      .collect();
    const row = matches.find((r) => r.entityKey === entityKey);
    if (!row) return { updated: 0 };
    await ctx.db.patch(row._id, { status, updatedAt: Date.now() });
    return { updated: 1 };
  },
});
