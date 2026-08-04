import { describe, expect, it } from "vitest";
import { evaluateCanadaSqo, CANADA_SQO_WINDOW_DAYS } from "@/lib/workability/canada-sqo";
import type { Account, Opportunity } from "@/lib/salesforce/types";

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function account(over: Partial<Account> = {}): Account {
  return {
    id: "A1",
    name: "Maple Manufacturing",
    domain: "maple.ca",
    ownerId: "u-pat",
    ownerName: "Pat Lee",
    industry: "Manufacturing",
    type: "Prospect",
    product: "Intacct",
    country: "Canada",
    tam: "Intacct",
    abmNurtureStatus: null,
    lastActivityDate: daysAgoIso(60),
    intacct: { hasOpenOpps: false },
    ...over,
  };
}

function sqoOpp(over: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "006-SQO",
    name: "Maple - Intacct SQO",
    accountId: "A1",
    ownerId: "u-ae",
    ownerName: "Pat Lee",
    createdBy: "Giulia Rossi",
    sourcedByTeam: "SDR",
    sqoDate: daysAgoIso(30),
    stage: "Closed Won",
    isClosed: true,
    createdDate: daysAgoIso(60),
    ...over,
  };
}

describe("evaluateCanadaSqo — 180-day XDR-sourced-SQO rule", () => {
  it("does not apply to non-Canadian accounts", () => {
    const result = evaluateCanadaSqo(account({ country: "United States" }), [sqoOpp()], "BDR");
    expect(result.applies).toBe(false);
    expect(result.status).toBe("PASS");
  });

  it("applies to Canada (also matches the 'CA' country code)", () => {
    const result = evaluateCanadaSqo(account({ country: "CA" }), [], "BDR");
    expect(result.applies).toBe(true);
    expect(result.status).toBe("PASS");
  });

  it("BDR (outbound): a recent XDR-sourced SQO blocks (FAIL)", () => {
    const result = evaluateCanadaSqo(account(), [sqoOpp({ sqoDate: daysAgoIso(30) })], "BDR");
    expect(result.status).toBe("FAIL");
    expect(result.conflict?.daysSince).toBe(30);
    expect(result.conflict?.daysUntilClear).toBe(CANADA_SQO_WINDOW_DAYS - 30);
    expect(result.reason).toContain("blocked by de-dupe");
  });

  it("SDR (inbound): the same recent XDR-sourced SQO is REVIEW, not a block", () => {
    const result = evaluateCanadaSqo(account(), [sqoOpp({ sqoDate: daysAgoIso(30) })], "SDR");
    expect(result.status).toBe("REVIEW");
    expect(result.reason).toContain("exceptions can be made");
    // Surfaces how long since the last XDR-sourced SQO — the manager's key ask.
    expect(result.reason).toContain("30 days ago");
  });

  it("an XDR-sourced SQO older than 180 days does not count", () => {
    const result = evaluateCanadaSqo(account(), [sqoOpp({ sqoDate: daysAgoIso(200) })], "BDR");
    expect(result.status).toBe("PASS");
    expect(result.conflict).toBeNull();
  });

  it("a prior SQO that was NOT XDR-sourced (no sourcedByTeam) does not count", () => {
    const result = evaluateCanadaSqo(
      account(),
      [sqoOpp({ sourcedByTeam: undefined, sqoDate: daysAgoIso(30) })],
      "BDR",
    );
    expect(result.status).toBe("PASS");
  });

  it("an XDR-sourced opp with no SQO credit (no sqoDate) does not count", () => {
    const result = evaluateCanadaSqo(account(), [sqoOpp({ sqoDate: null })], "BDR");
    expect(result.status).toBe("PASS");
  });

  it("credits the team when the sourcing rep has left", () => {
    const result = evaluateCanadaSqo(
      account(),
      [sqoOpp({ sourcedByTeam: "SDR", sourcedRepActive: false })],
      "SDR",
    );
    expect(result.conflict?.creditedKind).toBe("team");
    expect(result.conflict?.creditedTo).toBe("Inbound (SDR) team");
  });

  it("picks the most recent XDR-sourced SQO when several are in-window", () => {
    const result = evaluateCanadaSqo(
      account(),
      [
        sqoOpp({ id: "old", sqoDate: daysAgoIso(120) }),
        sqoOpp({ id: "new", name: "Recent SQO", sqoDate: daysAgoIso(20) }),
      ],
      "BDR",
    );
    expect(result.conflict?.name).toBe("Recent SQO");
    expect(result.conflict?.daysSince).toBe(20);
  });
});
