import { query } from "./_generated/server";

// Read-only diagnostics. Powers GET /api/health so an operator can confirm, from
// the browser, that the deployed app is talking to Convex and that the source
// tables were seeded — the two things that can't be checked from the repo alone
// (they depend on Vercel env vars + a one-time seed).
//
// Counts every source table. Convex has no count aggregate without the aggregate
// component, so we `collect().length`; the demo dataset is tiny, so reading the
// rows to count them is fine for a diagnostics endpoint.
const SOURCE_TABLES = [
  "gmoAccounts",
  "gmoLeads",
  "gmoContacts",
  "gmoOpportunities",
  "gmoActivities",
  "intacctAccounts",
  "intacctContacts",
  "intacctOpportunities",
  "intacctActivities",
  "fusionAccounts",
  "sdrLeads",
] as const;

export const counts = query({
  args: {},
  handler: async (ctx) => {
    const entries = await Promise.all(
      SOURCE_TABLES.map(
        async (table) => [table, (await ctx.db.query(table).collect()).length] as const,
      ),
    );
    return Object.fromEntries(entries) as Record<(typeof SOURCE_TABLES)[number], number>;
  },
});
