import { describe, expect, it, vi } from "vitest";
import { deriveLead, type LeadIntakeInput } from "@/lib/leads/lead-intake";
import { SCORE_WEIGHTS } from "@/lib/scoring/scoring";
import type { SdrLead } from "@/lib/leads/types";

// In-memory stand-in for the Postgres-backed captured-lead store, mirroring how
// the mock-provider tests stub out `overrides`.
vi.mock("@/lib/leads/lead-store", () => {
  const rows: SdrLead[] = [];
  return {
    insertCapturedLead: async (lead: SdrLead) => {
      rows.unshift(lead);
    },
    listCapturedLeads: async () => [...rows],
    getCapturedLead: async (id: string) => rows.find((r) => r.id === id) ?? null,
  };
});

const base: LeadIntakeInput = {
  firstName: "Jordan",
  lastName: "Rivera",
  email: "jordan@example.org",
  company: "Rivera Nonprofit Group",
  jobTitle: "VP Finance",
  companySize: "201–500",
  industry: "Nonprofit",
  productInterest: "Sage Intacct",
  timeframe: "Immediately",
  requestType: "Requested a demo",
};

describe("deriveLead", () => {
  it("scores a strong-fit, high-intent lead as P1", () => {
    const d = deriveLead(base);
    expect(d.fit).toBeGreaterThanOrEqual(75);
    expect(d.intent).toBeGreaterThanOrEqual(75);
    expect(d.priorityGroup).toBe("P1");
  });

  it("scores a weak, low-intent lead as P4/5", () => {
    const d = deriveLead({
      ...base,
      jobTitle: "Accounting Clerk",
      companySize: "1–50",
      industry: "Other",
      timeframe: "Just researching",
      requestType: "Newsletter signup",
    });
    expect(d.priorityGroup).toBe("P4/5");
    expect(d.score).toBeLessThan(55);
  });

  it("score reconciles with the pillars using the shared weights", () => {
    const d = deriveLead(base);
    const expected = Math.round(
      d.fit * SCORE_WEIGHTS.fit + d.intent * SCORE_WEIGHTS.intent + d.workability * SCORE_WEIGHTS.workability,
    );
    expect(d.score).toBe(expected);
  });

  it("clamps pillars to at most 95", () => {
    const d = deriveLead(base);
    expect(d.fit).toBeLessThanOrEqual(95);
    expect(d.intent).toBeLessThanOrEqual(95);
  });

  it("labels the source from the request type", () => {
    expect(deriveLead(base).source).toBe("Web form — Requested a demo");
  });
});

describe("MockSalesforceProvider.createLead", () => {
  it("creates a House-owned, unlinked lead at the top of the worklist", async () => {
    const { MockSalesforceProvider } = await import("@/lib/salesforce/mock/mock-provider");
    const provider = new MockSalesforceProvider();

    const lead = await provider.createLead(base);
    expect(lead.id).toMatch(/^00Q/);
    expect(lead.accountId).toBeNull();
    expect(lead.ownerName).toBe("House Account");
    expect(lead.name).toBe("Jordan Rivera");
    expect(lead.company).toBe("Rivera Nonprofit Group");

    const list = await provider.listSdrLeads();
    expect(list[0].id).toBe(lead.id);
    // No linked account, so the worklist falls back to the entered company name.
    expect(list[0].accountName).toBe("Rivera Nonprofit Group");
    expect(list[0].score).toBe(lead.score);
  });
});
