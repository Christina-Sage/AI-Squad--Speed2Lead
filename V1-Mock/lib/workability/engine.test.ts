import { describe, expect, it } from "vitest";
import { evaluateWorkability } from "@/lib/workability/engine";
import type { Account, AccountBundle, Contact, Lead, Opportunity } from "@/lib/salesforce/types";

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
    tam: "Intacct",
    abmNurtureStatus: null,
    lastActivityDate: daysAgoIso(60),
    intacct: { hasOpenOpps: false },
    ...overrides,
  };
}

function bundle(account: Account, opts: Partial<Pick<AccountBundle, "leads" | "contacts" | "opportunities">> = {}): AccountBundle {
  return {
    account,
    leads: opts.leads ?? [],
    contacts: opts.contacts ?? [],
    opportunities: opts.opportunities ?? [],
    activities: [],
  };
}

const cleanContact: Contact = {
  id: "003-1",
  name: "Clean Contact",
  title: "Office Manager",
  ownerId: "u1",
  ownerName: "Alex Rivera",
  accountId: "0015Y00002ABC123",
  lastActivityDate: daysAgoIso(60),
};

describe("evaluateWorkability", () => {
  it("returns WORKABLE when there are no violations", () => {
    const result = evaluateWorkability(bundle(baseAccount({}), { contacts: [cleanContact] }));
    expect(result.final_status).toBe("WORKABLE");
    expect(result.roe_status).toBe("PASS");
    expect(result.open_opportunity_status).toBe("PASS");
  });

  it("returns WORKABLE when TAM is blank (non-customer)", () => {
    const result = evaluateWorkability(bundle(baseAccount({ tam: null })));
    expect(result.final_status).toBe("WORKABLE");
    expect(result.tam_validation_status).toBe("PASS");
    expect(result.reason_codes).not.toContain("TAM_BLANK");
  });

  it("TAM Validation is PASS when TAM is Intacct, for both Customer and Prospect", () => {
    const prospect = evaluateWorkability(bundle(baseAccount({ type: "Prospect", tam: "Intacct" })));
    expect(prospect.tam_validation_status).toBe("PASS");
    expect(prospect.customer_status).toBe("PASS");

    const customer = evaluateWorkability(
      bundle(baseAccount({ type: "Customer", tam: "Intacct" }), { contacts: [cleanContact] }),
    );
    expect(customer.tam_validation_status).toBe("PASS");
    expect(customer.customer_status).toBe("PASS");
  });

  it("TAM Validation is WARNING when TAM is Expired Intacct TAM, even for a non-customer", () => {
    const result = evaluateWorkability(bundle(baseAccount({ type: "Prospect", tam: "Expired Intacct TAM" })));
    expect(result.tam_validation_status).toBe("WARNING");
    expect(result.customer_status).toBe("PASS");
    expect(result.final_status).toBe("WORKABLE WITH REVIEW");
  });

  it("matches the spec's golden example: Customer + Expired Intacct TAM -> WORKABLE WITH REVIEW", () => {
    const account = baseAccount({
      name: "ABC Foundation",
      domain: "abc.org",
      industry: "Nonprofit",
      type: "Customer",
      tam: "Expired Intacct TAM",
    });
    const result = evaluateWorkability(bundle(account, { contacts: [cleanContact] }));
    expect(result.final_status).toBe("WORKABLE WITH REVIEW");
    expect(result.roe_status).toBe("PASS");
    expect(result.open_opportunity_status).toBe("PASS");
    expect(result.tam_status).toBe("Expired Intacct TAM");
    expect(result.type).toBe("Customer");
    expect(result.reason_codes).toContain("CUSTOMER_EXPIRED_TAM");
    // Customer Validation (not just TAM Validation) must also show WARNING here.
    expect(result.customer_status).toBe("WARNING");
    expect(result.tam_validation_status).toBe("WARNING");
  });

  it("returns NOT WORKABLE (blocked) when Customer + TAM blank", () => {
    const account = baseAccount({ type: "Customer", tam: null });
    const result = evaluateWorkability(bundle(account));
    expect(result.final_status).toBe("NOT WORKABLE");
    expect(result.reason_codes).toContain("CUSTOMER_TAM_BLANK");
  });

  it("returns NOT WORKABLE on ROE violation (contact activity within 30 days)", () => {
    const violatingContact: Contact = {
      ...cleanContact,
      lastActivityDate: daysAgoIso(8),
    };
    const result = evaluateWorkability(bundle(baseAccount({}), { contacts: [violatingContact] }));
    expect(result.final_status).toBe("NOT WORKABLE");
    expect(result.roe_status).toBe("FAIL");
    expect(result.roe_detail.violatingRecords[0].daysSinceActivity).toBe(8);
  });

  it("returns NOT WORKABLE on ROE violation (lead activity within 30 days), regardless of team", () => {
    const violatingLead: Lead = {
      id: "00Q-1",
      name: "Hot Lead",
      title: "Sales Manager",
      ownerId: "u2",
      ownerName: "Sarah Jones",
      status: "Open",
      accountId: "0015Y00002ABC123",
      lastActivityDate: daysAgoIso(15),
    };
    const result = evaluateWorkability(
      bundle(baseAccount({}), { leads: [violatingLead], contacts: [cleanContact] }),
      "SDR",
    );
    expect(result.final_status).toBe("NOT WORKABLE");
    expect(result.roe_status).toBe("FAIL");
    expect(result.roe_scope).toBe("Leads + Contacts");
  });

  it("BDR still catches a Lead violation, even though BDR primarily works Contacts", () => {
    const violatingLead: Lead = {
      id: "00Q-2",
      name: "Hot Lead",
      title: "Sales Manager",
      ownerId: "u2",
      ownerName: "Sarah Jones",
      status: "Open",
      accountId: "0015Y00002ABC123",
      lastActivityDate: daysAgoIso(5),
    };
    const result = evaluateWorkability(
      bundle(baseAccount({}), { leads: [violatingLead], contacts: [cleanContact] }),
      "BDR",
    );
    expect(result.final_status).toBe("NOT WORKABLE");
    expect(result.roe_status).toBe("FAIL");
    expect(result.roe_scope).toBe("Leads + Contacts");
    expect(result.team).toBe("BDR");
  });

  it("SDR still catches a Contact violation, even though SDR primarily works Leads", () => {
    const violatingContact: Contact = { ...cleanContact, lastActivityDate: daysAgoIso(3) };
    const cleanLead: Lead = {
      id: "00Q-3",
      name: "Cold Lead",
      title: "Sales Manager",
      ownerId: "u2",
      ownerName: "Sarah Jones",
      status: "Open",
      accountId: "0015Y00002ABC123",
      lastActivityDate: daysAgoIso(90),
    };
    const result = evaluateWorkability(
      bundle(baseAccount({}), { leads: [cleanLead], contacts: [violatingContact] }),
      "SDR",
    );
    expect(result.final_status).toBe("NOT WORKABLE");
    expect(result.roe_status).toBe("FAIL");
    expect(result.roe_scope).toBe("Leads + Contacts");
    expect(result.team).toBe("SDR");
  });

  it("X3 checks both Leads and Contacts (rule not yet defined, defaults to both)", () => {
    const violatingLead: Lead = {
      id: "00Q-4",
      name: "Hot Lead",
      title: "Sales Manager",
      ownerId: "u2",
      ownerName: "Sarah Jones",
      status: "Open",
      accountId: "0015Y00002ABC123",
      lastActivityDate: daysAgoIso(5),
    };
    const result = evaluateWorkability(
      bundle(baseAccount({}), { leads: [violatingLead], contacts: [cleanContact] }),
      "X3",
    );
    expect(result.final_status).toBe("NOT WORKABLE");
    expect(result.roe_status).toBe("FAIL");
    expect(result.roe_scope).toBe("Leads + Contacts");
  });

  it("defaults to BDR team when no team is passed, still checking both Leads and Contacts", () => {
    const result = evaluateWorkability(bundle(baseAccount({}), { contacts: [cleanContact] }));
    expect(result.team).toBe("BDR");
    expect(result.roe_scope).toBe("Leads + Contacts");
  });

  it("returns NOT WORKABLE when a Salesforce open opportunity exists", () => {
    const openOpp: Opportunity = {
      id: "006-1",
      name: "Big Deal",
      accountId: "0015Y00002ABC123",
      ownerId: "u3",
      ownerName: "Pat Lee",
      stage: "Negotiation",
      isClosed: false,
      createdDate: daysAgoIso(10),
    };
    const result = evaluateWorkability(
      bundle(baseAccount({}), { contacts: [cleanContact], opportunities: [openOpp] }),
    );
    expect(result.final_status).toBe("NOT WORKABLE");
    expect(result.open_opportunity_status).toBe("FAIL");
    expect(result.open_opportunity_detail.openOpportunities[0].source).toBe("Salesforce");
  });

  it("returns NOT WORKABLE when an Intacct-sourced open opportunity exists", () => {
    const account = baseAccount({
      intacct: {
        hasOpenOpps: true,
        openOppDetails: [
          { name: "Intacct Deal", owner: "Jordan Kim", stage: "Open", createdDate: daysAgoIso(20) },
        ],
      },
    });
    const result = evaluateWorkability(bundle(account, { contacts: [cleanContact] }));
    expect(result.final_status).toBe("NOT WORKABLE");
    expect(result.open_opportunity_status).toBe("FAIL");
    expect(result.open_opportunity_detail.openOpportunities[0].source).toBe("Intacct");
  });

  it("ROE violation takes precedence in reason even when other review conditions exist", () => {
    const violatingContact: Contact = { ...cleanContact, lastActivityDate: daysAgoIso(2) };
    const account = baseAccount({ type: "Customer", tam: "Expired Intacct TAM" });
    const result = evaluateWorkability(bundle(account, { contacts: [violatingContact] }));
    expect(result.final_status).toBe("NOT WORKABLE");
    expect(result.reason_codes).toContain("ROE_VIOLATION");
  });
});
