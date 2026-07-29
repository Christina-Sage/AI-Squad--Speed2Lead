import { describe, expect, it } from "vitest";
import { evaluateLeadWorkability } from "@/lib/leads/lead-workability";
import type { LeadDuplicateInfo } from "@/lib/leads/lead-dedupe";
import type { SdrLead } from "@/lib/leads/types";
import type { Account, AccountBundle } from "@/lib/salesforce/types";
import type { PriorityGroup } from "@/lib/priority";

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: "0015Y00000LEADAC01",
    name: "Prospect Co",
    domain: "prospectco.com",
    ownerId: "house",
    ownerName: "House Account",
    industry: "Technology",
    type: "Prospect",
    product: "Intacct",
    tam: null,
    abmNurtureStatus: null,
    lastActivityDate: null,
    intacct: { hasOpenOpps: false },
    ...overrides,
  };
}

function bundle(acct: Account): AccountBundle {
  return { account: acct, leads: [], contacts: [], opportunities: [], activities: [] };
}

function lead(overrides: Partial<SdrLead> = {}): SdrLead {
  return {
    id: "00Q5Y0000LEAD001",
    name: "Jordan Blake",
    title: "CFO",
    accountId: "0015Y00000LEADAC01",
    ownerName: "House Account",
    status: "Open - Not Contacted",
    priorityGroup: "P1",
    product: "Intacct",
    fit: 70,
    intent: 65,
    workability: 60,
    score: 66,
    email: "jordan.blake@prospectco.com",
    ...overrides,
  };
}

const dupInfo: LeadDuplicateInfo = { duplicateOf: "Jordan Blake", matchedOn: "name" };

describe("evaluateLeadWorkability — SDR P1 policy", () => {
  it("downgrades a non-duplicate hard-fail (ROE) to review for a P1 lead", () => {
    // Lead owned by another rep => ROE hard-fail under normal rules.
    const result = evaluateLeadWorkability(
      lead({ priorityGroup: "P1", ownerName: "Pat Lee" }),
      bundle(account()),
      "SDR",
    );
    expect(result.final_status).toBe("WORKABLE WITH REVIEW");
    expect(result.checks.find((c) => c.key === "roe")?.state).toBe("warn");
  });

  it("keeps a duplicate lead as the only Don't-Work block for P1", () => {
    const result = evaluateLeadWorkability(
      lead({ priorityGroup: "P1", ownerName: "Pat Lee" }),
      bundle(account()),
      "SDR",
      dupInfo,
    );
    expect(result.final_status).toBe("NOT WORKABLE");
    // Duplicate still fails; the co-occurring ROE conflict is downgraded.
    expect(result.checks.find((c) => c.key === "dup")?.state).toBe("fail");
    expect(result.checks.find((c) => c.key === "roe")?.state).toBe("warn");
  });

  it("existing-customer account no longer blocks a P1 lead (review instead)", () => {
    const result = evaluateLeadWorkability(
      lead({ priorityGroup: "P1" }),
      bundle(account({ type: "Customer", tam: "Intacct" })),
      "SDR",
    );
    expect(result.final_status).toBe("WORKABLE WITH REVIEW");
    expect(result.checks.find((c) => c.key === "customer")?.state).toBe("warn");
  });

  it("does NOT apply the policy to lower-priority leads (ROE still blocks)", () => {
    for (const pg of ["P2/3", "P4/5"] as PriorityGroup[]) {
      const result = evaluateLeadWorkability(
        lead({ priorityGroup: pg, ownerName: "Pat Lee" }),
        bundle(account()),
        "SDR",
      );
      expect(result.final_status).toBe("NOT WORKABLE");
      expect(result.checks.find((c) => c.key === "roe")?.state).toBe("fail");
    }
  });
});
