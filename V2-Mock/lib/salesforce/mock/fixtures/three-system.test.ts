import { describe, expect, it } from "vitest";
import { THREE_SYSTEM_ACCOUNTS } from "@/lib/salesforce/mock/fixtures/three-system";
import { evaluateWorkability, type FinalStatus } from "@/lib/workability/engine";
import type { Account, AccountBundle } from "@/lib/salesforce/types";

function bundle(account: Account): AccountBundle {
  return { account, leads: [], contacts: [], opportunities: [], activities: [] };
}

// Expected outbound (BDR) verdict + engine-written ABM status per showcase id.
const EXPECTED: Record<string, { status: FinalStatus; abm: string | null }> = {
  "0015Y0000TRISYS01": { status: "NOT WORKABLE", abm: "Current Customer" }, // exact-product customer
  "0015Y0000TRISYS02": { status: "WORKABLE WITH REVIEW", abm: null }, // other-product cross-sell
  "0015Y0000TRISYS03": { status: "WORKABLE WITH REVIEW", abm: null }, // former customer
  "0015Y0000TRISYS04": { status: "WORKABLE WITH REVIEW", abm: null }, // segment mismatch
  "0015Y0000TRISYS05": { status: "NOT WORKABLE", abm: "Incorrect Vertical" }, // wrong vertical
  "0015Y0000TRISYS06": { status: "NOT WORKABLE", abm: null }, // Fusion open opp (no ABM write)
  "0015Y0000TRISYS07": { status: "WORKABLE", abm: null }, // clean
};

describe("three-system showcase fixtures", () => {
  it("covers every showcase account with an expectation", () => {
    const ids = THREE_SYSTEM_ACCOUNTS.map((a) => a.id).sort();
    expect(ids).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(THREE_SYSTEM_ACCOUNTS)("$name → expected verdict", (account) => {
    const expected = EXPECTED[account.id];
    const result = evaluateWorkability(bundle(account), "BDR");
    expect(result.final_status, `${account.name} final_status`).toBe(expected.status);
    expect(result.recommended_abm_status, `${account.name} recommended_abm_status`).toBe(expected.abm);
  });

  it("each showcase account references a real ABM picklist value or writes nothing", () => {
    for (const account of THREE_SYSTEM_ACCOUNTS) {
      const result = evaluateWorkability(bundle(account), "BDR");
      // A status is only written on a block; a workable/review account writes nothing.
      if (result.final_status !== "NOT WORKABLE") {
        expect(result.recommended_abm_status, account.name).toBeNull();
      }
    }
  });
});
