import {
  normalizeAddress,
  normalizeCompanyName,
  normalizeDomain,
} from "@/lib/salesforce/match-keys";

/**
 * Cross-instance account resolver.
 *
 * GMO SF, Intacct SF, and Fusion do not share account IDs, so this groups
 * accounts from the three systems into clusters that represent one real-world
 * company, and emits the rows persisted in the `accountResolution` crosswalk.
 *
 * Match rules (agreed priority):
 *   1. Same normalized domain  → link (confidence "high").
 *   2. Else same normalized company AND address → link ("medium").
 * Company name alone is deliberately NOT enough to auto-link (too many false
 * positives); such rows stand alone at "low" confidence for manual review.
 *
 * "1 or many" falls out naturally: any number of accounts (across or within a
 * system) that share a key land in the same cluster, which is exactly the
 * duplicate / multi-match signal the dedupe + ROE rules key off. Every input
 * account produces exactly one row (its cluster membership); all rows start as
 * "candidate" for review.
 *
 * Complexity is O(n) via bucketing. A production resolver would bucket off the
 * indexed `by_domain` in Convex rather than an in-memory pass.
 */

export type MatchSystem = "gmo" | "intacct" | "fusion";

export interface MatchAccount {
  system: MatchSystem;
  /** The account's native id in its system (GMO: the global id; others: nativeId). */
  accountId: string;
  domain: string | null;
  company: string | null;
  /** Free-text address/location line for the fallback match. */
  address: string | null;
}

export interface ResolutionRow {
  entityKey: string;
  system: string;
  accountId: string;
  domain: string | null;
  matchMethod: "website_domain" | "company_address" | "manual";
  confidence: "high" | "medium" | "low";
  status: "candidate";
}

interface Prepared {
  input: MatchAccount;
  domain: string | null;
  companyAddressKey: string | null;
}

function prepare(a: MatchAccount): Prepared {
  const domain = normalizeDomain(a.domain);
  const company = normalizeCompanyName(a.company);
  const address = normalizeAddress(a.address);
  const companyAddressKey = company && address ? `${company}|${address}` : null;
  return { input: a, domain, companyAddressKey };
}

/** Resolve accounts across systems into crosswalk rows. */
export function resolveAccounts(accounts: MatchAccount[]): ResolutionRow[] {
  const prepared = accounts.map(prepare);

  // Bucket counts tell us whether a key is shared (a real match) or unique.
  const domainCounts = new Map<string, number>();
  const caCounts = new Map<string, number>();
  for (const p of prepared) {
    if (p.domain) domainCounts.set(p.domain, (domainCounts.get(p.domain) ?? 0) + 1);
    if (p.companyAddressKey) {
      caCounts.set(p.companyAddressKey, (caCounts.get(p.companyAddressKey) ?? 0) + 1);
    }
  }

  return prepared.map((p) => {
    const sharedDomain = p.domain != null && (domainCounts.get(p.domain) ?? 0) > 1;
    const sharedCa = p.companyAddressKey != null && (caCounts.get(p.companyAddressKey) ?? 0) > 1;

    let entityKey: string;
    let matchMethod: ResolutionRow["matchMethod"];
    let confidence: ResolutionRow["confidence"];

    if (sharedDomain) {
      entityKey = `d:${p.domain}`;
      matchMethod = "website_domain";
      confidence = "high";
    } else if (sharedCa) {
      entityKey = `ca:${p.companyAddressKey}`;
      matchMethod = "company_address";
      confidence = "medium";
    } else {
      // Matched nothing else — stands alone pending review. Keyed by its own
      // identity so it never accidentally merges with another singleton.
      entityKey = `solo:${p.input.system}:${p.input.accountId}`;
      matchMethod = p.domain ? "website_domain" : p.companyAddressKey ? "company_address" : "manual";
      confidence = "low";
    }

    return {
      entityKey,
      system: p.input.system,
      accountId: p.input.accountId,
      domain: p.domain,
      matchMethod,
      confidence,
      status: "candidate" as const,
    };
  });
}
