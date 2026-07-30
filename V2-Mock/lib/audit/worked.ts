import { getConvex } from "@/lib/convex/server-client";
import { api } from "@/convex/_generated/api";

export type WorkedOutcome = "pushed" | "not_fit" | "archived";

export interface WorkedEntry {
  outcome: WorkedOutcome;
  reason: string | null;
}

// The worked-action set lives in the Convex query (convex/audit.ts); the daily
// cut-off is computed here and passed in so it uses the server's local clock.
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Today's worked accounts for a user, derived from the audit log. Resets daily
 * (entries before local midnight are ignored), so the worklist starts fresh
 * each day. Keyed by accountId; the most recent action for an account wins.
 */
export async function getWorkedToday(userId: string): Promise<Map<string, WorkedEntry>> {
  const rows = await getConvex().query(api.audit.workedToday, {
    userId,
    sinceMs: startOfToday().getTime(),
  });
  // Convex returns newest-first with one entry per account already resolved.
  return new Map(rows.map((r) => [r.accountId, { outcome: r.outcome, reason: r.reason }]));
}

/**
 * Every account this user has ever worked (pushed or marked Not a Fit), across
 * all days. Saved-worklist completion is lifetime — a campaign list is finished
 * once every account in it has been worked — so it uses this, not the daily
 * worked-today set.
 */
export async function getWorkedAccountIds(userId: string): Promise<Set<string>> {
  const ids = await getConvex().query(api.audit.workedAccountIds, { userId });
  return new Set(ids);
}
