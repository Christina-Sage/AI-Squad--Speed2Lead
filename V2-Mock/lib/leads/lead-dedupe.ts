/**
 * Lead-level duplicate detection for the SDR worklist.
 *
 * When two leads share a normalized name or email, the earliest one (by
 * createdAt) is treated as the original and every later match is flagged as a
 * duplicate — it moves from the workable worklist into "Blocked by de-dupe".
 * Fixture leads have no createdAt and sort first, so they act as the baseline a
 * freshly captured web-form lead is checked against.
 */

export interface DedupeLead {
  id: string;
  name: string;
  email?: string | null;
  createdAt?: string | null;
}

export interface LeadDuplicateInfo {
  /** Display name of the original lead this one duplicates. */
  duplicateOf: string;
  matchedOn: "name" | "email";
}

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function createdMs(createdAt: string | null | undefined): number {
  if (!createdAt) return 0; // fixtures (no timestamp) are the baseline "originals"
  const t = new Date(createdAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Returns a map of lead id → duplicate info for every lead that duplicates an
 * earlier one. Leads absent from the map are originals / unique.
 */
export function computeDuplicateLeads(leads: DedupeLead[]): Map<string, LeadDuplicateInfo> {
  const ordered = [...leads].sort((a, b) => {
    const byTime = createdMs(a.createdAt) - createdMs(b.createdAt);
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  });

  const seenNames = new Map<string, string>(); // normalized name -> original display name
  const seenEmails = new Map<string, string>(); // normalized email -> original display name
  const duplicates = new Map<string, LeadDuplicateInfo>();

  for (const lead of ordered) {
    const name = norm(lead.name);
    const email = norm(lead.email);

    if (name && seenNames.has(name)) {
      duplicates.set(lead.id, { duplicateOf: seenNames.get(name)!, matchedOn: "name" });
      continue;
    }
    if (email && seenEmails.has(email)) {
      duplicates.set(lead.id, { duplicateOf: seenEmails.get(email)!, matchedOn: "email" });
      continue;
    }
    if (name) seenNames.set(name, lead.name);
    if (email) seenEmails.set(email, lead.name);
  }

  return duplicates;
}

/** Duplicate info for a single lead within the full set, or null if it's unique. */
export function duplicateInfoFor(leadId: string, leads: DedupeLead[]): LeadDuplicateInfo | null {
  return computeDuplicateLeads(leads).get(leadId) ?? null;
}
