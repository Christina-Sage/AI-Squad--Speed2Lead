import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { outreachPushValidator } from "./validators";

// Work-it state keyed by account (or lead) id: applied data-hygiene fields and
// the latest Outreach push. Added contacts are not tracked here — they are real
// rows in the `contacts` table (researchAdded=true).

export const get = query({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const row = await ctx.db
      .query("workItState")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .first();
    if (!row) return { appliedHygieneFields: [], outreachPush: null };
    return {
      appliedHygieneFields: row.appliedHygieneFields,
      outreachPush: row.outreachPush,
    };
  },
});

async function ensureRow(
  ctx: MutationCtx,
  accountId: string,
): Promise<Doc<"workItState">> {
  const existing = await ctx.db
    .query("workItState")
    .withIndex("by_account", (q) => q.eq("accountId", accountId))
    .first();
  if (existing) return existing;
  const id = await ctx.db.insert("workItState", {
    accountId,
    appliedHygieneFields: [],
    outreachPush: null,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create workItState row");
  return created;
}

export const applyHygiene = mutation({
  args: { accountId: v.string(), field: v.string() },
  handler: async (ctx, { accountId, field }) => {
    const row = await ensureRow(ctx, accountId);
    const fields = new Set(row.appliedHygieneFields);
    fields.add(field);
    await ctx.db.patch(row._id, { appliedHygieneFields: Array.from(fields) });
  },
});

export const setOutreach = mutation({
  args: { accountId: v.string(), push: outreachPushValidator },
  handler: async (ctx, { accountId, push }) => {
    const row = await ensureRow(ctx, accountId);
    await ctx.db.patch(row._id, { outreachPush: push });
  },
});
