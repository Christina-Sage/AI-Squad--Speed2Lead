import type { Account } from "@/lib/salesforce/types";

export interface DuplicateMatch {
  id: string;
  name: string;
  domain: string;
  /** Which signals matched, e.g. ["Domain", "Parent account", "Location"]. */
  reasons: string[];
}

function eq(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Finds other accounts that look like duplicates of `account`, matching on any of:
 * domain, parent account, location/address, or account name.
 */
export function findDuplicates(account: Account, others: Account[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  for (const other of others) {
    if (other.id === account.id) continue;
    const reasons: string[] = [];
    if (eq(account.domain, other.domain)) reasons.push("Domain");
    if (eq(account.parentAccount, other.parentAccount)) reasons.push("Parent account");
    if (eq(account.location, other.location)) reasons.push("Location");
    if (eq(account.name, other.name)) reasons.push("Account name");
    if (reasons.length > 0) {
      matches.push({ id: other.id, name: other.name, domain: other.domain, reasons });
    }
  }
  return matches;
}

/** Human-readable reason string for the Duplicate Account checklist row. */
export function duplicateReason(matches: DuplicateMatch[]): string {
  if (matches.length === 0) {
    return "No duplicate found — domain, parent account, location, and name all clear";
  }
  const m = matches[0];
  const why = m.reasons.join(", ").toLowerCase();
  const extra =
    matches.length > 1 ? ` (and ${matches.length - 1} other record${matches.length - 1 === 1 ? "" : "s"})` : "";
  return `Possible duplicate of "${m.name}" — matched on ${why}${extra}. Verify before working.`;
}
