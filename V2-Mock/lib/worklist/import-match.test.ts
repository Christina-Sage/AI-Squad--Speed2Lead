import { describe, it, expect } from "vitest";
import { matchImportIdentifiers, type MatchableRow } from "./import-match";

const ACCOUNTS: MatchableRow[] = [
  { id: "0015Y00002ABC123", name: "Ironclad Group", domain: "ironcladgroup.com" },
  { id: "0015Y00000WAYN01", name: "Vertex Group", domain: "vertexgroup.com" },
  { id: "0015Y00002Z9Qb70", name: "Acme Robotics", domain: "acme.com" },
];

const LEADS: MatchableRow[] = [
  { id: "00Q5Y00001Ab2Cd", name: "Jordan Lee", accountName: "Acme Robotics", domain: "acme.com" },
  { id: "00Q5Y00001Kp9Xr", name: "Priya Shah", accountName: "Globex", domain: "globex.org" },
];

describe("matchImportIdentifiers — accounts (BDR)", () => {
  it("matches by id, domain, and name", () => {
    const { matchedIds, report } = matchImportIdentifiers(
      ["0015Y00002ABC123", "vertexgroup.com", "Acme Robotics"],
      ACCOUNTS,
    );
    expect(matchedIds).toEqual(
      new Set(["0015Y00002ABC123", "0015Y00000WAYN01", "0015Y00002Z9Qb70"]),
    );
    expect(report).toEqual({ total: 3, matched: 3, notFound: [] });
  });

  it("matches on a partial name (contains)", () => {
    const { matchedIds } = matchImportIdentifiers(["ironclad"], ACCOUNTS);
    expect(matchedIds).toEqual(new Set(["0015Y00002ABC123"]));
  });

  it("is case-insensitive and reports unmatched identifiers verbatim", () => {
    const { matchedIds, report } = matchImportIdentifiers(
      ["ACME.COM", "0015Y00000NOPE99"],
      ACCOUNTS,
    );
    expect(matchedIds).toEqual(new Set(["0015Y00002Z9Qb70"]));
    expect(report).toEqual({ total: 2, matched: 1, notFound: ["0015Y00000NOPE99"] });
  });
});

describe("matchImportIdentifiers — leads (SDR)", () => {
  it("matches leads by Lead ID and by name", () => {
    const { matchedIds, report } = matchImportIdentifiers(
      ["00Q5Y00001Ab2Cd", "Priya Shah"],
      LEADS,
    );
    expect(matchedIds).toEqual(new Set(["00Q5Y00001Ab2Cd", "00Q5Y00001Kp9Xr"]));
    expect(report.matched).toBe(2);
  });

  it("matches a lead by its linked account name", () => {
    const { matchedIds } = matchImportIdentifiers(["Acme"], LEADS);
    expect(matchedIds).toEqual(new Set(["00Q5Y00001Ab2Cd"]));
  });

  it("does not match account ids against the lead worklist", () => {
    const { matchedIds, report } = matchImportIdentifiers(["0015Y00002ABC123"], LEADS);
    expect(matchedIds.size).toBe(0);
    expect(report.notFound).toEqual(["0015Y00002ABC123"]);
  });
});
