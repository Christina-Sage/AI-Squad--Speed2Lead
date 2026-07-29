// Pure matcher shared by the "Import list" flow. Given the identifiers a rep
// pasted (or uploaded via CSV) and the rows currently in Today's Worklist, it
// resolves which rows to filter the worklist down to and reports what it could
// not place. Kept free of React/DOM so it can be unit-tested directly.

export interface MatchableRow {
  id: string;
  name: string;
  /** Account domain / lead company domain, when known. */
  domain?: string | null;
  /** For leads: the linked account name, so "Acme" can match a lead at Acme. */
  accountName?: string | null;
}

export interface ImportMatchResult {
  /** Row ids to filter the worklist to. */
  matchedIds: Set<string>;
  report: {
    /** How many identifiers were submitted. */
    total: number;
    /** How many distinct rows matched. */
    matched: number;
    /** Identifiers (verbatim) that matched no row. */
    notFound: string[];
  };
}

/**
 * Match pasted identifiers against worklist rows. An identifier hits a row when
 * it equals the row id or domain, equals the row name, or is contained in the
 * name / linked account name (so a partial company name still resolves). The
 * same rules apply to accounts (BDR) and leads (SDR) — the caller passes the
 * rows for whichever worklist is active.
 */
export function matchImportIdentifiers(
  identifiers: string[],
  rows: MatchableRow[],
): ImportMatchResult {
  const matchedIds = new Set<string>();
  const notFound: string[] = [];

  for (const raw of identifiers) {
    const q = raw.trim().toLowerCase();
    if (!q) continue;
    const hit = rows.find(
      (r) =>
        r.id.toLowerCase() === q ||
        (r.domain != null && r.domain.toLowerCase() === q) ||
        r.name.toLowerCase() === q ||
        r.name.toLowerCase().includes(q) ||
        (r.accountName != null && r.accountName.toLowerCase().includes(q)),
    );
    if (hit) matchedIds.add(hit.id);
    else notFound.push(raw);
  }

  return {
    matchedIds,
    report: { total: identifiers.length, matched: matchedIds.size, notFound },
  };
}
