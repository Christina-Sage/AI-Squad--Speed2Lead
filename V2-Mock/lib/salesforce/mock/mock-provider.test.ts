import { describe, expect, it, vi } from "vitest";
import { evaluateWorkability } from "@/lib/workability/engine";

vi.mock("@/lib/salesforce/mock/overrides", () => {
  const store = new Map();
  return {
    getOverride: async (accountId: string) => store.get(accountId),
    getAllOverrides: async () => new Map(store),
    setOverride: async (accountId: string, override: unknown) => {
      store.set(accountId, override);
    },
  };
});

// Lead capture persists to Postgres; stub it so tests run DB-free. No captured
// leads means listSdrLeads returns just the in-code fixtures.
vi.mock("@/lib/leads/lead-store", () => ({
  listCapturedLeads: async () => [],
  getCapturedLead: async () => null,
  insertCapturedLead: async () => {},
}));

const { MockSalesforceProvider } = await import("@/lib/salesforce/mock/mock-provider");
const provider = new MockSalesforceProvider();

const expectedFinalStatusByDomain: Record<string, string> = {
  "acme.com": "WORKABLE",
  // A Fusion partner relationship (not a deal registration) flags for review.
  "globex.org": "WORKABLE WITH REVIEW",
  "abc.org": "WORKABLE WITH REVIEW",
  "initech.com": "NOT WORKABLE",
  "hooli.com": "NOT WORKABLE",
  "stark.io": "NOT WORKABLE",
  // Any DQ'd opp flags for review (there's a DQ history to read) — never a
  // hard block. Wayne's DQ'd opp never reached Discovery; still review.
  "wayne.com": "WORKABLE WITH REVIEW",
  // DQ opp reached Discovery, closed 60 days ago (past the 30-day cooling-off)
  // — still review so the check matches the DQ history.
  "umbrella-pharma.com": "WORKABLE WITH REVIEW",
  // Active partner deal registration flags for review, it does not block.
  "umbrella-security.com": "WORKABLE WITH REVIEW",
};

describe("MockSalesforceProvider + engine integration", () => {
  it.each(Object.entries(expectedFinalStatusByDomain))(
    "domain %s -> %s",
    async (domain, expected) => {
      const outcome = await provider.search(domain);
      expect(outcome.matchType).toBe("single");
      if (outcome.matchType !== "single") return;

      const bundle = await provider.getAccountBundle(outcome.account.id);
      expect(bundle).not.toBeNull();
      const result = evaluateWorkability(bundle!);
      expect(result.final_status).toBe(expected);
    },
  );

  it("returns a disambiguation list for duplicate account names", async () => {
    const outcome = await provider.search("Umbrella Corp");
    expect(outcome.matchType).toBe("multiple");
    if (outcome.matchType === "multiple") {
      expect(outcome.matches.length).toBe(2);
    }
  });

  it("finds an account by global account id", async () => {
    const outcome = await provider.search("0015Y00002ABC123");
    expect(outcome.matchType).toBe("single");
    if (outcome.matchType === "single") {
      expect(outcome.account.name).toBe("ABC Foundation");
    }
  });

  it("assignToMe updates owner and ABM nurture status", async () => {
    const updated = await provider.assignToMe("0015Y00000ACME01", "demo-1", "Demo User");
    expect(updated.ownerName).toBe("Demo User");
    expect(updated.abmNurtureStatus).toBe("Working");
  });
});

describe("MockSalesforceProvider.searchLeads (SDR)", () => {
  it("finds a lead by its exact Lead ID", async () => {
    const leads = await provider.listSdrLeads();
    const target = leads[0];
    const outcome = await provider.searchLeads(target.id);
    expect(outcome.matchType).toBe("single");
    if (outcome.matchType === "single") {
      expect(outcome.lead.id).toBe(target.id);
      expect(outcome.lead.name).toBe(target.name);
    }
  });

  it("finds a lead by name (case-insensitive, partial)", async () => {
    const leads = await provider.listSdrLeads();
    const target = leads[0];
    const outcome = await provider.searchLeads(target.name.toLowerCase());
    expect(outcome.matchType === "single" || outcome.matchType === "multiple").toBe(true);
    const ids =
      outcome.matchType === "single"
        ? [outcome.lead.id]
        : outcome.matchType === "multiple"
          ? outcome.matches.map((m) => m.id)
          : [];
    expect(ids).toContain(target.id);
  });

  it("finds a lead by work email when present", async () => {
    const leads = await provider.listSdrLeads();
    const withEmail = leads.find((l) => l.email);
    if (!withEmail) return; // fixtures may not include an emailed lead
    const outcome = await provider.searchLeads(withEmail.email!);
    expect(outcome.matchType).not.toBe("none");
  });

  it("returns none for an account id (leads and accounts are separate)", async () => {
    const outcome = await provider.searchLeads("0015Y00002ABC123");
    expect(outcome.matchType).toBe("none");
  });
});
