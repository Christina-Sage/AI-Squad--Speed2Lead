import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export type WorkedOutcome = "pushed" | "not_fit" | "archived";

export interface WorkedEntry {
  outcome: WorkedOutcome;
  reason: string | null;
}

// A record counts as "worked" once it's been pushed to Outreach or marked Not
// a Fit. Both actions live in the audit log, so worked-state needs no schema
// change and no extra table (locked decision). The "worked" action set is
// applied in the Convex query (convex/auditLog.ts:workedByUser).

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Rows come back newest-first, so the first entry seen for an account is the
// most recent — later (older) rows for the same account are skipped.
function buildWorkedMap(
  rows: { accountId: string | null; action: string; reason: string | null }[],
): Map<string, WorkedEntry> {
  const worked = new Map<string, WorkedEntry>();
  for (const row of rows) {
    if (!row.accountId || worked.has(row.accountId)) continue;
    worked.set(row.accountId, {
      outcome:
        row.action === "NOT_A_FIT"
          ? "not_fit"
          : row.action === "ARCHIVE_LEAD"
            ? "archived"
            : "pushed",
      reason: row.reason ?? null,
    });
  }
  return worked;
}

/**
 * Today's worked accounts for a user, derived from the audit log. Resets daily
 * (entries before local midnight are ignored), so the worklist starts fresh
 * each day. Keyed by accountId; the most recent action for an account wins.
 */
export async function getWorkedToday(userId: string): Promise<Map<string, WorkedEntry>> {
  const rows = await fetchQuery(api.auditLog.workedByUser, {
    userId,
    sinceMs: startOfToday().getTime(),
  });
  return buildWorkedMap(rows);
}

/**
 * Every account a user has ever worked, with outcome — the lifetime view. Used
 * for a selected saved worklist, whose progress is lifetime (a campaign is done
 * once every account has been worked, not just today's).
 */
export async function getWorkedEverMap(userId: string): Promise<Map<string, WorkedEntry>> {
  const rows = await fetchQuery(api.auditLog.workedByUser, { userId });
  return buildWorkedMap(rows);
}

/**
 * Every account this user has ever worked (pushed or marked Not a Fit), across
 * all days. Saved-worklist completion is lifetime — a campaign list is finished
 * once every account in it has been worked — so it uses this, not the daily
 * worked-today set.
 */
export async function getWorkedAccountIds(userId: string): Promise<Set<string>> {
  const rows = await fetchQuery(api.auditLog.workedByUser, { userId });

  const ids = new Set<string>();
  for (const row of rows) {
    if (row.accountId) ids.add(row.accountId);
  }
  return ids;
}
