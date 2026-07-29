import { describe, expect, it, vi } from "vitest";
import { evaluateLeadWorkability } from "@/lib/leads/lead-workability";
import { evaluatePartner } from "@/lib/workability/partner";
import { VAR_ACCOUNTS, VAR_SDR_LEADS } from "@/lib/salesforce/mock/fixtures/var-leads";

vi.mock("@/lib/salesforce/mock/overrides", () => {
  const store = new Map();
  return {
    getOverride: async (id: string) => store.get(id),
    getAllOverrides: async () => new Map(store),
    setOverride: async (id: string, o: unknown) => void store.set(id, o),
  };
});
vi.mock("@/lib/leads/lead-store", () => ({
  listCapturedLeads: async () => [],
  getCapturedLead: async () => null,
  insertCapturedLead: async () => {},
}));

const { MockSalesforceProvider } = await import("@/lib/salesforce/mock/mock-provider");
const provider = new MockSalesforceProvider();

const PRODUCTS = ["Intacct", "X3", "BMS", "S50", "CRE", "SSG"];

describe("VAR showcase leads (SDR)", () => {
  it("adds 5 VAR leads per product line (30 total)", () => {
    expect(VAR_SDR_LEADS).toHaveLength(30);
    for (const p of PRODUCTS) {
      expect(VAR_SDR_LEADS.filter((l) => l.product === p)).toHaveLength(5);
    }
  });

  it("backs every VAR lead with a found account that has a partner relationship", () => {
    for (const lead of VAR_SDR_LEADS) {
      const account = VAR_ACCOUNTS.find((a) => a.id === lead.accountId);
      expect(account, `account for ${lead.id}`).toBeDefined();
      const partner = evaluatePartner(account!);
      expect(partner.hasRelationship).toBe(true);
      expect(partner.source === "Intacct" || partner.source === "Fusion").toBe(true);
    }
  });

  it("represents both Intacct and Fusion partner sources", () => {
    const sources = new Set(VAR_ACCOUNTS.map((a) => evaluatePartner(a).source));
    expect(sources.has("Intacct")).toBe(true);
    expect(sources.has("Fusion")).toBe(true);
  });

  it("keeps the backing VAR accounts out of the BDR account worklist", async () => {
    const listed = await provider.listAccounts();
    const listedIds = new Set(listed.map((a) => a.id));
    for (const a of VAR_ACCOUNTS) expect(listedIds.has(a.id)).toBe(false);
  });

  it("resolves each VAR lead to WORKABLE WITH REVIEW (partner), not blocked", async () => {
    for (const lead of VAR_SDR_LEADS) {
      const bundle = await provider.getSdrLeadBundle(lead.id);
      expect(bundle, `bundle for ${lead.id}`).not.toBeNull();
      const result = evaluateLeadWorkability(bundle!.lead, bundle!.accountBundle, "SDR", null);
      expect(result.final_status).toBe("WORKABLE WITH REVIEW");
    }
  });
});
