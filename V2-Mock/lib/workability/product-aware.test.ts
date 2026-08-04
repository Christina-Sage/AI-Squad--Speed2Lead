import { describe, expect, it } from "vitest";
import { evaluateWorkability } from "@/lib/workability/engine";
import type { Account, AccountBundle } from "@/lib/salesforce/types";

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function baseAccount(overrides: Partial<Account>): Account {
  return {
    id: "0015Y00002ABC123",
    name: "Test Account",
    domain: "test.com",
    ownerId: "demo-1",
    ownerName: "Demo User",
    industry: "Technology",
    type: "Prospect",
    product: "Intacct",
    tam: "Intacct",
    abmNurtureStatus: null,
    lastActivityDate: daysAgoIso(60),
    intacct: { hasOpenOpps: false },
    ...overrides,
  };
}

function bundle(account: Account): AccountBundle {
  return { account, leads: [], contacts: [], opportunities: [], activities: [] };
}

describe("product-aware customer verdict", () => {
  it("current customer of the EXACT product being worked → NOT WORKABLE + Current Customer", () => {
    const r = evaluateWorkability(
      bundle(
        baseAccount({
          type: "Customer",
          product: "Intacct",
          workedProduct: "Sage Intacct",
          customerProducts: [{ product: "Sage Intacct", system: "Intacct", status: "current" }],
        }),
      ),
    );
    expect(r.final_status).toBe("NOT WORKABLE");
    expect(r.customer_status).toBe("BLOCKED");
    expect(r.reason_codes).toContain("CUSTOMER_EXACT_PRODUCT");
    expect(r.recommended_abm_status).toBe("Current Customer");
  });

  it("current customer of a DIFFERENT product (same segment) → REVIEW, not blocked", () => {
    // BMS: worked for Sage 300, but they own Sage 100 — different exact product.
    const r = evaluateWorkability(
      bundle(
        baseAccount({
          type: "Customer",
          product: "BMS",
          tam: "BMS",
          workedProduct: "Sage 300",
          customerProducts: [{ product: "Sage 100", system: "Fusion", status: "current" }],
        }),
      ),
    );
    expect(r.final_status).toBe("WORKABLE WITH REVIEW");
    expect(r.customer_status).toBe("WARNING");
    expect(r.reason_codes).toContain("CUSTOMER_OTHER_PRODUCT");
    // A review lands in the worklist → engine writes no status.
    expect(r.recommended_abm_status).toBeNull();
  });

  it("name collision resolves on the full product name (Sage 100 vs Sage 300)", () => {
    // Owns the exact worked product → block, even though both are BMS.
    const blocked = evaluateWorkability(
      bundle(
        baseAccount({
          type: "Customer",
          product: "BMS",
          tam: "BMS",
          workedProduct: "Sage 300",
          customerProducts: [{ product: "Sage 300", system: "Fusion", status: "current" }],
        }),
      ),
    );
    expect(blocked.final_status).toBe("NOT WORKABLE");
    expect(blocked.reason_codes).toContain("CUSTOMER_EXACT_PRODUCT");
  });

  it("former customer of any product → REVIEW (win-back)", () => {
    const r = evaluateWorkability(
      bundle(
        baseAccount({
          type: "Prospect",
          product: "X3",
          tam: "X3",
          workedProduct: "Sage X3",
          customerProducts: [{ product: "Sage X3", system: "Fusion", status: "former" }],
        }),
      ),
    );
    expect(r.final_status).toBe("WORKABLE WITH REVIEW");
    expect(r.customer_status).toBe("WARNING");
    expect(r.reason_codes).toContain("CUSTOMER_FORMER");
  });

  it("TAM segment ≠ worked segment (non-customer) → REVIEW (segment mismatch)", () => {
    const r = evaluateWorkability(
      bundle(baseAccount({ type: "Prospect", product: "X3", tam: "Intacct", workedProduct: "Sage X3" })),
    );
    expect(r.final_status).toBe("WORKABLE WITH REVIEW");
    expect(r.reason_codes).toContain("SEGMENT_MISMATCH");
    expect(r.checks.find((c) => c.key === "tam")?.state).toBe("warn");
  });

  it("TAM=Intacct + non-Intacct product + customer → REVIEW (mismatch beats block)", () => {
    // Confirmed rule: a customer worked in a different segment stays review.
    const r = evaluateWorkability(
      bundle(
        baseAccount({
          type: "Customer",
          product: "X3",
          tam: "Intacct",
          workedProduct: "Sage X3",
        }),
      ),
    );
    expect(r.final_status).toBe("WORKABLE WITH REVIEW");
    expect(r.reason_codes).toContain("CUSTOMER_OTHER_PRODUCT");
  });
});

describe("wrong vertical", () => {
  it("construction industry worked as non-CRE (outbound) → NOT WORKABLE via TAM + Incorrect Vertical", () => {
    const r = evaluateWorkability(
      bundle(baseAccount({ type: "Prospect", industry: "Construction", product: "BMS", tam: "BMS" })),
      "BDR",
    );
    expect(r.final_status).toBe("NOT WORKABLE");
    expect(r.reason_codes).toContain("WRONG_VERTICAL");
    expect(r.checks.find((c) => c.key === "tam")?.state).toBe("fail");
    expect(r.recommended_abm_status).toBe("Incorrect Vertical");
  });

  it("does not fire for the CRE segment (correct vertical)", () => {
    const r = evaluateWorkability(
      bundle(baseAccount({ type: "Prospect", industry: "Construction", product: "CRE", tam: "CRE" })),
      "BDR",
    );
    expect(r.reason_codes).not.toContain("WRONG_VERTICAL");
  });

  it("does not fire for inbound (SDR) — no vertical step in the lead audit", () => {
    const r = evaluateWorkability(
      bundle(baseAccount({ type: "Prospect", industry: "Construction", product: "BMS", tam: "BMS" })),
      "SDR",
    );
    expect(r.reason_codes).not.toContain("WRONG_VERTICAL");
  });
});

describe("Intacct open opportunities (Fusion has none)", () => {
  const withIntacctOpp = (created: number) =>
    baseAccount({
      product: "Intacct",
      tam: "Intacct",
      workedProduct: "Sage Intacct",
      intacct: {
        hasOpenOpps: true,
        openOppDetails: [
          { name: "Intacct Deal", owner: "Dana Fields", stage: "Negotiation", createdDate: daysAgoIso(created) },
        ],
      },
    });

  it("outbound (BDR): a recent Intacct-SF open opp hard-blocks", () => {
    const r = evaluateWorkability(bundle(withIntacctOpp(20)), "BDR");
    expect(r.open_opportunity_status).toBe("FAIL");
    expect(r.final_status).toBe("NOT WORKABLE");
    expect(r.open_opportunity_detail.openOpportunities[0].source).toBe("Intacct");
  });

  it("inbound (SDR): an Intacct-SF open opp is review, never a hard block", () => {
    const r = evaluateWorkability(bundle(withIntacctOpp(5)), "SDR");
    expect(r.open_opportunity_status).toBe("REVIEW");
    expect(r.final_status).toBe("WORKABLE WITH REVIEW");
  });
});
