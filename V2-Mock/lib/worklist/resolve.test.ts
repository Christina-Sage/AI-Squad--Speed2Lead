import { describe, it, expect } from "vitest";
import { resolveAccountIdentifiers, resolveLeadIdentifiers } from "@/lib/worklist/resolve";
import type { AccountListItem } from "@/lib/salesforce/types";
import type { SdrLeadListItem } from "@/lib/leads/types";

const acct = (id: string, domain: string, name: string): AccountListItem => ({
  id,
  name,
  domain,
  ownerId: "",
  ownerName: "",
  type: "Prospect",
  industry: "Manufacturing",
  product: "Intacct",
});

const lead = (id: string, email: string | null): SdrLeadListItem => ({
  id,
  name: "Test Lead",
  title: "Controller",
  accountId: null,
  accountName: null,
  domain: null,
  priorityGroup: "P1",
  product: "Intacct",
  score: 70,
  fit: 70,
  intent: 70,
  workability: 70,
  email,
  createdAt: null,
});

describe("resolveAccountIdentifiers", () => {
  const accounts = [
    acct("0015Y00000ACME01", "acme.com", "Acme Robotics"),
    acct("0015Y00000GLBX01", "globex.org", "Globex Nonprofit"),
  ];

  it("matches by exact Global Account ID (case-insensitive)", () => {
    const r = resolveAccountIdentifiers(["0015y00000acme01"], accounts);
    expect(r.matched.map((a) => a.id)).toEqual(["0015Y00000ACME01"]);
    expect(r.notFound).toEqual([]);
  });

  it("matches by exact domain", () => {
    const r = resolveAccountIdentifiers(["globex.org"], accounts);
    expect(r.matched.map((a) => a.id)).toEqual(["0015Y00000GLBX01"]);
  });

  it("reports unresolved identifiers and does not match on name", () => {
    const r = resolveAccountIdentifiers(["Acme Robotics", "0015Y00000FAKE99"], accounts);
    expect(r.matched).toEqual([]);
    expect(r.notFound).toEqual(["Acme Robotics", "0015Y00000FAKE99"]);
  });

  it("de-dupes a record referenced by both id and domain", () => {
    const r = resolveAccountIdentifiers(["0015Y00000ACME01", "acme.com"], accounts);
    expect(r.matched).toHaveLength(1);
  });
});

describe("resolveLeadIdentifiers", () => {
  const leads = [lead("00Q5Y00000SARAH1", "sarah.chen@acme.com"), lead("00Q5Y00000DEVON1", null)];

  it("matches by Lead ID and by work email", () => {
    expect(resolveLeadIdentifiers(["00Q5Y00000SARAH1"], leads).matched).toHaveLength(1);
    expect(resolveLeadIdentifiers(["SARAH.CHEN@ACME.COM"], leads).matched[0].id).toBe(
      "00Q5Y00000SARAH1",
    );
  });

  it("reports unresolved identifiers", () => {
    const r = resolveLeadIdentifiers(["nobody@nowhere.com"], leads);
    expect(r.matched).toEqual([]);
    expect(r.notFound).toEqual(["nobody@nowhere.com"]);
  });
});
