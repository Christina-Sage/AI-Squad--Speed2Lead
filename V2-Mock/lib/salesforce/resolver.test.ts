import { describe, expect, it } from "vitest";
import { resolveAccounts, type MatchAccount } from "./resolver";
import { fusionNativeId, intacctNativeId } from "./source-tables";
import { isFusionAccountId } from "./match-keys";

function byId(rows: ReturnType<typeof resolveAccounts>) {
  return new Map(rows.map((r) => [`${r.system}:${r.accountId}`, r]));
}

describe("resolveAccounts", () => {
  it("links accounts across systems that share a domain (high confidence)", () => {
    const accounts: MatchAccount[] = [
      { system: "gmo", accountId: "G1", domain: "acme.com", company: "Acme", address: "1 A St" },
      { system: "intacct", accountId: "I1", domain: "acme.com", company: "Acme Inc", address: null },
      { system: "fusion", accountId: "F1", domain: "ACME.com", company: "Acme", address: null },
    ];
    const rows = byId(resolveAccounts(accounts));
    const g = rows.get("gmo:G1")!;
    expect(g.matchMethod).toBe("website_domain");
    expect(g.confidence).toBe("high");
    // All three share one cluster.
    expect(rows.get("intacct:I1")!.entityKey).toBe(g.entityKey);
    expect(rows.get("fusion:F1")!.entityKey).toBe(g.entityKey);
  });

  it("falls back to company + address when domains differ (medium confidence)", () => {
    const accounts: MatchAccount[] = [
      { system: "gmo", accountId: "G1", domain: "acme.com", company: "Acme Robotics", address: "1200 Industrial Way, Detroit, MI" },
      { system: "intacct", accountId: "I1", domain: "acmerobotics.com", company: "Acme Robotics Corp", address: "1200 Industrial Way, Detroit, MI" },
    ];
    const rows = byId(resolveAccounts(accounts));
    // Different domains -> not a domain match; same company (suffix-stripped) +
    // address -> linked at medium.
    expect(rows.get("gmo:G1")!.entityKey).toBe(rows.get("intacct:I1")!.entityKey);
    expect(rows.get("gmo:G1")!.matchMethod).toBe("company_address");
    expect(rows.get("gmo:G1")!.confidence).toBe("medium");
  });

  it("does not link on company name alone (no address) — stands alone at low", () => {
    const accounts: MatchAccount[] = [
      { system: "gmo", accountId: "G1", domain: null, company: "Globex", address: null },
      { system: "intacct", accountId: "I1", domain: null, company: "Globex", address: null },
    ];
    const rows = byId(resolveAccounts(accounts));
    expect(rows.get("gmo:G1")!.entityKey).not.toBe(rows.get("intacct:I1")!.entityKey);
    expect(rows.get("gmo:G1")!.confidence).toBe("low");
  });

  it("emits exactly one row per input account, all as candidates", () => {
    const accounts: MatchAccount[] = [
      { system: "gmo", accountId: "G1", domain: "a.com", company: "A", address: null },
      { system: "gmo", accountId: "G2", domain: "a.com", company: "A", address: null },
    ];
    const rows = resolveAccounts(accounts);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === "candidate")).toBe(true);
    // Two GMO accounts on one domain cluster together — the intra-system
    // duplicate signal.
    expect(rows[0].entityKey).toBe(rows[1].entityKey);
  });
});

describe("native id synthesis", () => {
  it("fusion ids are the confirmed 400 + 7-digit shape and deterministic", () => {
    const id = fusionNativeId("0015Y00000ACME01");
    expect(isFusionAccountId(id)).toBe(true);
    expect(fusionNativeId("0015Y00000ACME01")).toBe(id); // stable
  });

  it("intacct ids are distinct from the GMO id and deterministic", () => {
    const gmo = "0015Y00000ACME01";
    const id = intacctNativeId(gmo);
    expect(id).not.toBe(gmo);
    expect(intacctNativeId(gmo)).toBe(id); // stable
  });
});
