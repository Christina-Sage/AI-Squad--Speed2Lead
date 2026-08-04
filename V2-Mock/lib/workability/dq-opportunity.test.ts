import { describe, expect, it } from "vitest";
import { evaluateDqOpportunities } from "@/lib/workability/dq-opportunity";
import type { Opportunity } from "@/lib/salesforce/types";

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function dqOpp(over: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "006-DQ",
    name: "Acme - Intacct Evaluation",
    accountId: "A1",
    ownerId: "u-ae",
    ownerName: "Pat Lee",
    createdBy: "Giulia Rossi",
    stage: "Closed Lost - Disqualified",
    isClosed: true,
    createdDate: daysAgoIso(90),
    furthestStage: "Discovery",
    movedToDiscoveryDate: daysAgoIso(80),
    closedDate: daysAgoIso(15),
    ...over,
  };
}

describe("evaluateDqOpportunities — post-DQ ROE ownership", () => {
  it("PASSes when there is no DQ'd opp on record", () => {
    const result = evaluateDqOpportunities([]);
    expect(result.status).toBe("PASS");
    expect(result.reviewOpportunities).toHaveLength(0);
  });

  it("within the 30-day window, the sourcing XDR retains ROE by name", () => {
    const result = evaluateDqOpportunities([dqOpp()]);
    expect(result.status).toBe("REVIEW");
    expect(result.reviewOpportunities).toHaveLength(1);
    const r = result.reviewOpportunities[0];
    expect(r.roeHolder).toBe("Giulia Rossi");
    expect(r.roeHolderKind).toBe("rep");
    // Closed 15 days ago -> 15 days left in the 30-day window.
    expect(r.daysRemaining).toBe(15);
    expect(r.roeThroughDate).not.toBeNull();
    expect(result.reason).toContain("Giulia Rossi retains ROE");
    expect(result.reason).toContain("15 more days");
  });

  it("when the sourcing rep has left, ROE falls to the Inbound (SDR) team", () => {
    const result = evaluateDqOpportunities([
      dqOpp({ sourcedByTeam: "SDR", sourcedRepActive: false }),
    ]);
    expect(result.status).toBe("REVIEW");
    const r = result.reviewOpportunities[0];
    expect(r.roeHolderKind).toBe("team");
    expect(r.roeHolder).toBe("Inbound (SDR) team");
    expect(result.reason).toContain("Inbound (SDR) team retains ROE");
    expect(result.reason).toContain("the sourcing rep has left the team");
  });

  it("when the sourcing rep has left, ROE falls to the Outbound (BDR) team", () => {
    const result = evaluateDqOpportunities([
      dqOpp({ sourcedByTeam: "BDR", sourcedRepActive: false }),
    ]);
    const r = result.reviewOpportunities[0];
    expect(r.roeHolder).toBe("Outbound (BDR) team");
  });

  it("past the 30-day window, it still REVIEWs (history worth reading) with no active ROE holder", () => {
    const result = evaluateDqOpportunities([dqOpp({ closedDate: daysAgoIso(45) })]);
    expect(result.status).toBe("REVIEW");
    expect(result.reviewOpportunities).toHaveLength(0);
    expect(result.reason).toContain("past the 30-day ROE window");
  });

  it("an opp that never reached Discovery does not open an ROE window", () => {
    const result = evaluateDqOpportunities([
      dqOpp({ furthestStage: "Prospecting", movedToDiscoveryDate: null, closedDate: daysAgoIso(5) }),
    ]);
    expect(result.status).toBe("REVIEW");
    expect(result.reviewOpportunities).toHaveLength(0);
    expect(result.reason).toContain("never reached Discovery");
  });

  it("falls back to the owner name when no createdBy/team is recorded", () => {
    const result = evaluateDqOpportunities([dqOpp({ createdBy: undefined })]);
    expect(result.reviewOpportunities[0].roeHolder).toBe("Pat Lee");
  });
});
