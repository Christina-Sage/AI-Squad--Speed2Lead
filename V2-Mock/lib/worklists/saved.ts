import { fetchMutation, fetchQuery } from "convex/nextjs";
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
  await fetchMutation(api.savedWorklists.create, {
    id,
    userId,
    name: input.name,
    source: input.source ?? null,
    accountIds: input.accountIds,
    expiresAt: input.expiresAt ? new Date(input.expiresAt).getTime() : null,
  });
  return id;
}

export async function archiveSavedWorklist(userId: string, id: string): Promise<void> {
  await fetchMutation(api.savedWorklists.archive, { userId, id });
}

export async function reopenSavedWorklist(userId: string, id: string): Promise<void> {
  await fetchMutation(api.savedWorklists.reopen, { userId, id });
}

export async function deleteSavedWorklist(userId: string, id: string): Promise<void> {
  await fetchMutation(api.savedWorklists.remove, { userId, id });
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
  // Rows come back newest-first from Convex, with timestamps as epoch ms.
  const rows = await fetchQuery(api.savedWorklists.listByUser, { userId });

  const now = Date.now();
  const views: SavedWorklistView[] = [];
  for (const row of rows) {
    const accountIds = Array.isArray(row.accountIds) ? row.accountIds : [];
    const total = accountIds.length;
    const worked = accountIds.filter((id) => workedEver.has(id)).length;

    const expMs = row.expiresAt ?? null;
    const archMs = row.archivedAt ?? null;
    const expired = expMs !== null && expMs < now;

    // Purge archived or expired lists once they're past the grace period.
    const purgeAnchor = archMs ?? (expired ? expMs : null);
    if (purgeAnchor !== null && now - purgeAnchor > GRACE_MS) continue;

    const complete = total > 0 && worked >= total;
    const status: SavedWorklistStatus =
      archMs || complete ? "completed" : expired ? "expired" : "active";

    views.push({
      id: row.id,
      name: row.name,
      source: row.source,
      accountIds,
      createdAt: new Date(row.createdAt).toISOString(),
      expiresAt: expMs !== null ? new Date(expMs).toISOString() : null,
      archivedAt: archMs !== null ? new Date(archMs).toISOString() : null,
      total,
      worked,
      status,
    });
  }
  return views;
}
