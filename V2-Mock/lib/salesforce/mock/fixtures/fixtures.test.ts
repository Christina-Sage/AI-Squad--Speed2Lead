import { describe, expect, it } from "vitest";
import type { AccountBundle } from "@/lib/salesforce/types";
import { evaluateWorkability } from "@/lib/workability/engine";
import { ACCOUNTS } from "@/lib/salesforce/mock/fixtures/accounts";
import { LEADS } from "@/lib/salesforce/mock/fixtures/leads";
import { CONTACTS } from "@/lib/salesforce/mock/fixtures/contacts";
import { OPPORTUNITIES } from "@/lib/salesforce/mock/fixtures/opportunities";
import { ACTIVITIES } from "@/lib/salesforce/mock/fixtures/activities";
import { SDR_LEADS } from "@/lib/salesforce/mock/fixtures/sdr-leads";

const accountIds = new Set(ACCOUNTS.map((a) => a.id));

function bundleFor(accountId: string): AccountBundle {
  const account = ACCOUNTS.find((a) => a.id === accountId);
  if (!account) throw new Error(`No fixture account ${accountId}`);
  return {
    account,
    leads: LEADS.filter((l) => l.accountId === accountId),
    contacts: CONTACTS.filter((c) => c.accountId === accountId),
    opportunities: OPPORTUNITIES.filter((o) => o.accountId === accountId),
    activities: ACTIVITIES.filter((a) => a.accountId === accountId),
  };
}

describe("fixture referential integrity", () => {
  it("every lead points at a real account", () => {
    for (const lead of LEADS) expect(accountIds.has(lead.accountId)).toBe(true);
  });

  it("every contact points at a real account", () => {
    for (const contact of CONTACTS) expect(accountIds.has(contact.accountId)).toBe(true);
  });

  it("every opportunity points at a real account", () => {
    for (const opp of OPPORTUNITIES) expect(accountIds.has(opp.accountId)).toBe(true);
  });

  it("every activity points at a real account", () => {
    for (const act of ACTIVITIES) expect(accountIds.has(act.accountId)).toBe(true);
  });

  it("every SDR lead points at a real account or null (no dangling account id)", () => {
    for (const lead of SDR_LEADS) {
      if (lead.accountId !== null) expect(accountIds.has(lead.accountId)).toBe(true);
    }
  });

  it("account ids are unique", () => {
    expect(new Set(ACCOUNTS.map((a) => a.id)).size).toBe(ACCOUNTS.length);
  });

  it("record ids are unique within each object type", () => {
    for (const [label, ids] of [
      ["leads", LEADS.map((l) => l.id)],
      ["contacts", CONTACTS.map((c) => c.id)],
      ["opportunities", OPPORTUNITIES.map((o) => o.id)],
      ["activities", ACTIVITIES.map((a) => a.id)],
      ["sdrLeads", SDR_LEADS.map((l) => l.id)],
    ] as const) {
      expect(new Set(ids).size, `${label} have duplicate ids`).toBe(ids.length);
    }
  });
});

describe("new fixture scenarios evaluate as intended", () => {
  it("Vertex Logistics is NOT WORKABLE via an Intacct-sourced open opportunity", () => {
    const result = evaluateWorkability(bundleFor("0015Y00000VRTX01"));
    expect(result.final_status).toBe("NOT WORKABLE");
    expect(result.open_opportunity_status).toBe("FAIL");
    expect(result.open_opportunity_detail.openOpportunities[0].source).toBe("Intacct");
  });

  it("Redwood Freight is NOT WORKABLE via a lead-driven ROE conflict", () => {
    const result = evaluateWorkability(bundleFor("0015Y00000RDWD01"));
    expect(result.final_status).toBe("NOT WORKABLE");
    expect(result.roe_status).toBe("FAIL");
    expect(result.roe_detail.violatingRecords[0].recordType).toBe("Lead");
  });

  it.each([
    ["0015Y00000MERD01", "Meridian Capital Partners (Financial Services)"],
    ["0015Y00000CSTL01", "Coastline Hospitality Group (Hospitality)"],
    ["0015Y00000NMBS01", "Nimbus Software (Software)"],
    ["0015Y00000CNST01", "Cornerstone Business Services (General Business, Potential VAR)"],
  ])("%s -> WORKABLE (%s)", (accountId) => {
    const result = evaluateWorkability(bundleFor(accountId));
    expect(result.final_status).toBe("WORKABLE");
  });

  it("Cornerstone's 'Potential VAR' note does not block (Partner check PASS)", () => {
    const result = evaluateWorkability(bundleFor("0015Y00000CNST01"));
    expect(result.partner_status).toBe("PASS");
  });
});

describe("enriched contacts do not regress workable accounts (ROE-safe)", () => {
  // These accounts must stay off the 30-day ROE window after enrichment.
  it.each(["0015Y00000ACME01", "0015Y00000GLBX01", "0015Y00002ABC123", "0015Y00000WAYN01"])(
    "%s has no contact/lead activity within the 30-day ROE window",
    (accountId) => {
      const result = evaluateWorkability(bundleFor(accountId));
      expect(result.roe_status).toBe("PASS");
    },
  );
});
