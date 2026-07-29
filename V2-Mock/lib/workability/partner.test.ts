import { describe, expect, it } from "vitest";
import { evaluatePartner } from "@/lib/workability/partner";
import type { Account } from "@/lib/salesforce/types";

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: "0015Y00000TEST01",
    name: "Test Account",
    domain: "test.com",
    ownerId: "u1",
    ownerName: "Owner",
    industry: "Technology",
    type: "Prospect",
    product: "Intacct",
    tam: "Intacct",
    abmNurtureStatus: null,
    lastActivityDate: null,
    intacct: { hasOpenOpps: false },
    ...overrides,
  };
}

describe("evaluatePartner", () => {
  it("passes when there is no partner relationship", () => {
    const r = evaluatePartner(account());
    expect(r.status).toBe("PASS");
    expect(r.hasRelationship).toBe(false);
  });

  it("flags any Intacct VAR relationship for review (broadened, not just registered)", () => {
    const r = evaluatePartner(account({ intacct: { hasOpenOpps: false, varStatus: "Potential VAR" } }));
    expect(r.status).toBe("REVIEW");
    expect(r.hasRelationship).toBe(true);
    expect(r.registered).toBe(false);
    expect(r.source).toBe("Intacct");
  });

  it("marks an active deal registration as the registered subset", () => {
    const r = evaluatePartner(
      account({ intacct: { hasOpenOpps: false, varStatus: "Registered - Ridgeline Partners" } }),
    );
    expect(r.status).toBe("REVIEW");
    expect(r.registered).toBe(true);
    expect(r.partnerName).toBe("Ridgeline Partners");
  });

  it("flags a Fusion partner relationship for review, source Fusion", () => {
    const r = evaluatePartner(account({ fusion: { partnerStatus: "Identified - Meridian Consulting" } }));
    expect(r.status).toBe("REVIEW");
    expect(r.source).toBe("Fusion");
    expect(r.registered).toBe(false);
    expect(r.partnerName).toBe("Meridian Consulting");
  });

  it("prefers Intacct over Fusion when both are present", () => {
    const r = evaluatePartner(
      account({
        intacct: { hasOpenOpps: false, varStatus: "Registered - CloudServe" },
        fusion: { partnerStatus: "Identified - Other" },
      }),
    );
    expect(r.source).toBe("Intacct");
    expect(r.registered).toBe(true);
  });
});
