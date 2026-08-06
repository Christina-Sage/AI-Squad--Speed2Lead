import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import {
  EXAMPLE_SAVED_WORKLISTS,
  EXAMPLE_WORKLIST_ID_PREFIX,
  exampleViewId,
} from "@/lib/worklists/mock/example-worklists";

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
  /**
   * In-memory example (demo) list, not a user-created Convex row. Read-only —
   * the picker hides the archive/reopen/remove actions for these.
   */
  readOnly?: boolean;
}

// Locked decision: on expiry a list is archived, then purged after a grace
// period rather than hard-deleted on the date.
const GRACE_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The example Saved Worklists as in-memory views — demo data shown in the
 * picker without Convex or the seed route. Their pre-worked progress
 * (3/12, 10/12, 12/12 → Completed) comes from each spec's `workedCount`, so the
 * picker looks pre-worked even when the audit log is empty. createdAt is offset
 * by definition index so the first list sorts newest, matching the old seed.
 */
export function buildExampleWorklistViews(): SavedWorklistView[] {
  const now = Date.now();
  return EXAMPLE_SAVED_WORKLISTS.map((wl, i) => {
    const total = wl.accountIds.length;
    const worked = Math.min(wl.workedCount, total);
    const complete = total > 0 && worked >= total;
    const expiresAt = wl.expiresInDays !== null ? now + wl.expiresInDays * DAY_MS : null;
    return {
      id: exampleViewId(wl.key),
      name: wl.name,
      source: wl.source,
      accountIds: wl.accountIds,
      createdAt: new Date(now - i * 1000).toISOString(),
      expiresAt: expiresAt !== null ? new Date(expiresAt).toISOString() : null,
      archivedAt: null,
      total,
      worked,
      status: complete ? "completed" : "active",
      readOnly: true,
    };
  });
}

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
  // Example lists are in-memory demo data — always present, and independent of
  // Convex, so the picker is populated even on the mock demo.
  const examples = buildExampleWorklistViews();

  // Rows come back newest-first from Convex, with timestamps as epoch ms. If
  // Convex is unavailable (the in-memory demo), fall back to just the examples
  // rather than failing the whole picker.
  let rows: Awaited<ReturnType<typeof fetchQuery<typeof api.savedWorklists.listByUser>>> = [];
  try {
    rows = await fetchQuery(api.savedWorklists.listByUser, { userId });
  } catch (err) {
    console.error("[worklist] saved worklists (convex) unavailable:", err);
  }

  const now = Date.now();
  const views: SavedWorklistView[] = [];
  for (const row of rows) {
    // Drop any legacy Convex-seeded example rows — the in-memory examples above
    // are now the single source, so keeping both would double them.
    if (typeof row.id === "string" && row.id.startsWith(EXAMPLE_WORKLIST_ID_PREFIX)) continue;

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
  return [...examples, ...views];
}
