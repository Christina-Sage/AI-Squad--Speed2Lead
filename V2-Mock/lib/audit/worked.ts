import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";

export type WorkedOutcome = "pushed" | "not_fit";

export interface WorkedEntry {
  outcome: WorkedOutcome;
  reason: string | null;
}

// A record counts as "worked" once it's been pushed to Outreach or marked Not
// a Fit. Both actions live in the audit log, so worked-state needs no schema
// change and no extra table (locked decision).
const WORKED_ACTIONS = ["PUSH_OUTREACH", "NOT_A_FIT"];

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
  const rows = await db
    .select({
      accountId: auditLog.accountId,
      action: auditLog.action,
      reason: auditLog.reason,
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.userId, userId),
        inArray(auditLog.action, WORKED_ACTIONS),
        gte(auditLog.createdAt, startOfToday()),
      ),
    )
    .orderBy(desc(auditLog.createdAt));

  const worked = new Map<string, WorkedEntry>();
  for (const row of rows) {
    // Rows are newest-first, so the first entry seen for an account is the
    // most recent — later (older) rows for the same account are skipped.
    if (!row.accountId || worked.has(row.accountId)) continue;
    worked.set(row.accountId, {
      outcome: row.action === "NOT_A_FIT" ? "not_fit" : "pushed",
      reason: row.reason ?? null,
    });
  }
  return worked;
}
