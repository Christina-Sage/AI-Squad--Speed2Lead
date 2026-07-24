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

const { MockSalesforceProvider } = await import("@/lib/salesforce/mock/mock-provider");
const provider = new MockSalesforceProvider();

const expectedFinalStatusByDomain: Record<string, string> = {
  "acme.com": "WORKABLE",
  "globex.org": "WORKABLE",
  "abc.org": "WORKABLE WITH REVIEW",
  "initech.com": "NOT WORKABLE",
  "hooli.com": "NOT WORKABLE",
  "stark.io": "NOT WORKABLE",
  // v2: Wayne's DQ'd opp never reached Discovery, so it no longer blocks.
  "wayne.com": "WORKABLE",
  // DQ opp reached Discovery but closed 60 days ago — past the 30-day
  // cooling-off, so it no longer blocks.
  "umbrella-pharma.com": "WORKABLE",
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
