import type { FoundContact } from "@/lib/research/types";

/**
 * Deterministic "researched" contacts per account, merged into live research
 * output so demo accounts show a stable cast regardless of what the live web
 * fetch returns. Each seed is cross-referenced against Salesforce like any
 * other find: a seed whose name isn't already in Salesforce surfaces as a new
 * contact that needs the rep's review before it can be pushed to Outreach.
 */
const SEEDED_RESEARCH_CONTACTS: Record<
  string,
  Pick<FoundContact, "name" | "title" | "source">[]
> = {
  // Halcyon Robotics — a fresh finance name from research, not yet in Salesforce.
  "0015Y00000HLCN01": [{ name: "Jordan Wells", title: "VP Finance", source: "website" }],
};

export function seededResearchContacts(accountId: string): FoundContact[] {
  return (SEEDED_RESEARCH_CONTACTS[accountId] ?? []).map((c) => ({
    name: c.name,
    title: c.title,
    source: c.source,
    isIcpMatch: false,
    inSalesforce: false,
    matchedRecord: null,
  }));
}
