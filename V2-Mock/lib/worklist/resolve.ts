// Resolves the identifiers a rep pasted/uploaded against the records that live
// in the database, so a CSV upload BUILDS a worklist (fetched + deduped +
// scored) rather than merely filtering what's already on screen.
//
// Matching is exact, by design (confirmed): an account resolves by Global
// Account ID or website domain; a lead resolves by Lead ID or work email.
// Names are deliberately not matched — they collide across duplicate accounts.
// De-duped: the same record referenced twice counts once. Anything that
// resolves to nothing is reported back verbatim as "not found".
import type { AccountListItem } from "@/lib/salesforce/types";
import type { SdrLeadListItem } from "@/lib/leads/types";

export interface ResolveResult<T> {
  matched: T[];
  notFound: string[];
}

export function resolveAccountIdentifiers(
  identifiers: string[],
  accounts: AccountListItem[],
): ResolveResult<AccountListItem> {
  const byId = new Map<string, AccountListItem>();
  const byDomain = new Map<string, AccountListItem>();
  for (const a of accounts) {
    byId.set(a.id.toLowerCase(), a);
    if (a.domain) byDomain.set(a.domain.toLowerCase(), a);
  }
  const matched: AccountListItem[] = [];
  const notFound: string[] = [];
  const seen = new Set<string>();
  for (const raw of identifiers) {
    const q = raw.trim().toLowerCase();
    if (!q) continue;
    const hit = byId.get(q) ?? byDomain.get(q);
    if (hit) {
      if (!seen.has(hit.id)) {
        seen.add(hit.id);
        matched.push(hit);
      }
    } else {
      notFound.push(raw.trim());
    }
  }
  return { matched, notFound };
}

export function resolveLeadIdentifiers(
  identifiers: string[],
  leads: SdrLeadListItem[],
): ResolveResult<SdrLeadListItem> {
  const byId = new Map<string, SdrLeadListItem>();
  const byEmail = new Map<string, SdrLeadListItem>();
  for (const l of leads) {
    byId.set(l.id.toLowerCase(), l);
    if (l.email) byEmail.set(l.email.toLowerCase(), l);
  }
  const matched: SdrLeadListItem[] = [];
  const notFound: string[] = [];
  const seen = new Set<string>();
  for (const raw of identifiers) {
    const q = raw.trim().toLowerCase();
    if (!q) continue;
    const hit = byId.get(q) ?? byEmail.get(q);
    if (hit) {
      if (!seen.has(hit.id)) {
        seen.add(hit.id);
        matched.push(hit);
      }
    } else {
      notFound.push(raw.trim());
    }
  }
  return { matched, notFound };
}
