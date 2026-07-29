import type { FoundContact } from "@/lib/research/types";
import { accountContactCast, type CastPerson } from "@/lib/research/account-cast";

/**
 * Deterministic "researched" contacts, merged into live research output so every
 * account surfaces new ICP finance contacts that aren't yet in Salesforce —
 * demonstrating the Existing Contacts "⚠ Needs your review → Confirm & add"
 * flow on every work-it page, not just the seeded demo account.
 *
 * The finds come from the shared per-account cast (see account-cast.ts), which
 * also drives the on-file Salesforce contacts for generated accounts — so the
 * "New Contact" finds and the "In Salesforce"/"Inactive" rows stay consistent.
 * Each find is cross-referenced against Salesforce like any real research hit;
 * because these names aren't on file, they stay flagged for review.
 */

// Accounts pinned to specific finds. Halcyon carries three finds: two whose
// titles collide with existing Salesforce contacts (CFO → Dana Reyes,
// Controller → Priya Shah) to demonstrate the "Inactive" flag, plus one
// non-colliding find (VP Finance) that stays a normal New Contact.
const EXPLICIT: Record<string, CastPerson[]> = {
  "0015Y00000HLCN01": [
    { name: "Sofia Marin", title: "CFO" },
    { name: "Elena Park", title: "Controller" },
    { name: "Jordan Wells", title: "VP Finance" },
  ],
};

export function seededResearchContacts(accountId: string): FoundContact[] {
  const seeds = EXPLICIT[accountId] ?? accountContactCast(accountId).finds;
  return seeds.map((seed) => ({
    name: seed.name,
    title: seed.title,
    source: "website",
    isIcpMatch: false,
    inSalesforce: false,
    matchedRecord: null,
  }));
}
