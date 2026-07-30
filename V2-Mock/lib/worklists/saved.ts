import { getConvex } from "@/lib/convex/server-client";
import { api } from "@/convex/_generated/api";

/**
 * active    — still being worked; shown in the picker's Active group.
 * completed — every account worked, or manually archived; Completed group.
 * expired   — past its expiration date; Completed group, labelled Expired.
 * Purged rows (archived/expired beyond the grace period) are not returned.
 */
export type SavedWorklistStatus = "active" | "completed" | "expired";

export interface SavedWorklistView {
  id: string;
  name: string;
  source: string | null;
  accountIds: string[];
  createdAt: string;
  expiresAt: string | null;
  archivedAt: string | null;
  total: number;
  worked: number;
  status: SavedWorklistStatus;
}

// Locked decision: on expiry a list is archived, then purged after a grace
// period rather than hard-deleted on the date.
const GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export const SAVED_WORKLIST_COOKIE = "saved_worklist";

/** Cookie value -> selected saved-list id, or null for "All accounts". */
export function getSelectedWorklistId(cookieValue: string | undefined): string | null {
  return cookieValue && cookieValue !== "all" ? cookieValue : null;
}

export async function createSavedWorklist(
  userId: string,
  input: { name: string; accountIds: string[]; expiresAt: string | null; source?: string | null },
): Promise<string> {
  const id = `swl_${crypto.randomUUID()}`;
  await getConvex().mutation(api.worklists.create, {
    extId: id,
    userId,
    name: input.name,
    source: input.source ?? null,
    accountIds: input.accountIds,
    expiresAt: input.expiresAt ? new Date(input.expiresAt).getTime() : null,
  });
  return id;
}

export async function archiveSavedWorklist(userId: string, id: string): Promise<void> {
  await getConvex().mutation(api.worklists.archive, { userId, extId: id });
}

export async function reopenSavedWorklist(userId: string, id: string): Promise<void> {
  await getConvex().mutation(api.worklists.reopen, { userId, extId: id });
}

export async function deleteSavedWorklist(userId: string, id: string): Promise<void> {
  await getConvex().mutation(api.worklists.del, { userId, extId: id });
}

/**
 * A user's saved worklists with derived status and progress. `workedEver` is the
 * set of accounts the user has ever worked (see getWorkedAccountIds); a list is
 * complete once every account in it is in that set. Purged rows are dropped.
 */
export async function listSavedWorklists(
  userId: string,
  workedEver: Set<string>,
): Promise<SavedWorklistView[]> {
  // Convex returns rows newest-first with ms-epoch timestamps (createdAt from
  // _creationTime; expiresAt/archivedAt are numbers or null). new Date(ms) below
  // handles them the same way the former Date columns were handled.
  const rows = await getConvex().query(api.worklists.listForUser, { userId });

  const now = Date.now();
  const views: SavedWorklistView[] = [];
  for (const row of rows) {
    const accountIds = Array.isArray(row.accountIds) ? (row.accountIds as string[]) : [];
    const total = accountIds.length;
    const worked = accountIds.filter((id) => workedEver.has(id)).length;

    const expMs = row.expiresAt ? new Date(row.expiresAt).getTime() : null;
    const archMs = row.archivedAt ? new Date(row.archivedAt).getTime() : null;
    const expired = expMs !== null && expMs < now;

    // Purge archived or expired lists once they're past the grace period.
    const purgeAnchor = archMs ?? (expired ? expMs : null);
    if (purgeAnchor !== null && now - purgeAnchor > GRACE_MS) continue;

    const complete = total > 0 && worked >= total;
    const status: SavedWorklistStatus =
      row.archivedAt || complete ? "completed" : expired ? "expired" : "active";

    views.push({
      id: row.id,
      name: row.name,
      source: row.source,
      accountIds,
      createdAt: new Date(row.createdAt).toISOString(),
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
      archivedAt: row.archivedAt ? new Date(row.archivedAt).toISOString() : null,
      total,
      worked,
      status,
    });
  }
  return views;
}
