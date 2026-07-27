import type { FoundContact } from "@/lib/research/types";

/**
 * Deterministic "researched" contacts, merged into live research output so every
 * account surfaces at least one new ICP finance contact that isn't yet in
 * Salesforce — demonstrating the Existing Contacts "⚠ Needs your review →
 * Confirm & add" flow on every work-it page, not just the seeded demo account.
 *
 * Each find is cross-referenced against Salesforce like any real research hit;
 * because these names aren't on file, they stay flagged for review. One find is
 * assigned per account, chosen deterministically from the pool by account id so
 * it's stable across renders and reasonably distinct between accounts. Titles
 * are all finance/accounting so they pass the ICP filter and map to a role.
 */

interface Seed {
  name: string;
  title: string;
}

const REVIEW_FINDS: Seed[] = [
  { name: "Jordan Wells", title: "VP Finance" },
  { name: "Alex Monroe", title: "Director of Finance" },
  { name: "Sydney Park", title: "Controller" },
  { name: "Devon Ellis", title: "Assistant Controller" },
  { name: "Harper Sloane", title: "Director of Accounting" },
  { name: "Rowan Blake", title: "VP of Finance" },
  { name: "Emerson Cole", title: "Finance Director" },
  { name: "Sasha Nolan", title: "Senior Finance Manager" },
  { name: "Cameron Hayes", title: "Head of Finance" },
  { name: "Palmer Reid", title: "Corporate Controller" },
  { name: "Noah Whitfield", title: "Director of Financial Planning" },
  { name: "Ivy Chandler", title: "VP, Accounting" },
  { name: "Elliot Bishop", title: "Director of Finance & Accounting" },
  { name: "Lena Ortiz", title: "Assistant Director of Finance" },
  { name: "Theo Marsh", title: "Finance Manager" },
  { name: "Nadia Frost", title: "Director of Financial Reporting" },
];

// Accounts pinned to specific finds. Halcyon carries three finds: two whose
// titles collide with existing Salesforce contacts (CFO → Dana Reyes,
// Controller → Priya Shah) to demonstrate the "Inactive" flag, plus one
// non-colliding find (VP Finance) that stays a normal New Contact.
const EXPLICIT: Record<string, Seed[]> = {
  "0015Y00000HLCN01": [
    { name: "Sofia Marin", title: "CFO" },
    { name: "Elena Park", title: "Controller" },
    { name: "Jordan Wells", title: "VP Finance" },
  ],
};

/** Stable index into REVIEW_FINDS derived from the account id. */
function pickIndex(accountId: string): number {
  let h = 0;
  for (let i = 0; i < accountId.length; i += 1) {
    h = (h * 31 + accountId.charCodeAt(i)) >>> 0;
  }
  return h % REVIEW_FINDS.length;
}

export function seededResearchContacts(accountId: string): FoundContact[] {
  const seeds = EXPLICIT[accountId] ?? [REVIEW_FINDS[pickIndex(accountId)]];
  return seeds.map((seed) => ({
    name: seed.name,
    title: seed.title,
    source: "website",
    isIcpMatch: false,
    inSalesforce: false,
    matchedRecord: null,
  }));
}
