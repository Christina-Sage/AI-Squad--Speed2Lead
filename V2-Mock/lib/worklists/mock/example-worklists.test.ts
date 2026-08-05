import { describe, it, expect } from "vitest";
import {
  EXAMPLE_SAVED_WORKLISTS,
  EXAMPLE_WORKED_ACCOUNT_IDS,
  EXAMPLE_WORKLIST_ACCOUNTS,
  exampleWorklistId,
} from "@/lib/worklists/mock/example-worklists";
import { ACCOUNTS } from "@/lib/salesforce/mock/fixtures/accounts";
import type { Product } from "@/lib/products";

const EXAMPLE_IDS = new Set(EXAMPLE_WORKLIST_ACCOUNTS.map((a) => a.id));

describe("EXAMPLE_SAVED_WORKLISTS", () => {
  it("defines the three example lists with unique keys, in Active-then-Completed order", () => {
    const keys = EXAMPLE_SAVED_WORKLISTS.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(EXAMPLE_SAVED_WORKLISTS.map((w) => w.name)).toEqual([
      "Tradeshow — Money20/20",
      "BMS Upsell",
      "ABX MV Dental",
    ]);
  });

  it("expires every list within the 30-day retention window", () => {
    for (const wl of EXAMPLE_SAVED_WORKLISTS) {
      expect(wl.expiresInDays).not.toBeNull();
      expect(wl.expiresInDays!).toBeGreaterThan(0);
      expect(wl.expiresInDays!).toBeLessThanOrEqual(30);
    }
  });

  it("references only its own dedicated, de-duplicated accounts", () => {
    for (const wl of EXAMPLE_SAVED_WORKLISTS) {
      expect(wl.accountIds.length).toBeGreaterThan(0);
      expect(new Set(wl.accountIds).size).toBe(wl.accountIds.length);
      for (const id of wl.accountIds) expect(EXAMPLE_IDS.has(id)).toBe(true);
    }
  });

  it("has a worked prefix per list matching the pre-worked states (3 / 10 / 12)", () => {
    const worked = new Set(EXAMPLE_WORKED_ACCOUNT_IDS);
    const counts = EXAMPLE_SAVED_WORKLISTS.map((wl) => ({
      total: wl.accountIds.length,
      worked: wl.accountIds.filter((id) => worked.has(id)).length,
      declared: wl.workedCount,
    }));
    expect(counts).toEqual([
      { total: 12, worked: 3, declared: 3 },
      { total: 12, worked: 10, declared: 10 },
      { total: 12, worked: 12, declared: 12 },
    ]);
    // The worked list is exactly the union of each list's worked prefix.
    expect(EXAMPLE_WORKED_ACCOUNT_IDS.length).toBe(3 + 10 + 12);
    expect(new Set(EXAMPLE_WORKED_ACCOUNT_IDS).size).toBe(EXAMPLE_WORKED_ACCOUNT_IDS.length);
  });

  it("spans every product line across each list's accounts", () => {
    const allProducts: Product[] = ["Intacct", "X3", "BMS", "S50", "CRE", "SSG"];
    const byId = new Map(EXAMPLE_WORKLIST_ACCOUNTS.map((a) => [a.id, a]));
    for (const wl of EXAMPLE_SAVED_WORKLISTS) {
      const products = new Set(wl.accountIds.map((id) => byId.get(id)?.product));
      for (const p of allProducts) expect(products.has(p)).toBe(true);
    }
  });
});

describe("EXAMPLE_WORKLIST_ACCOUNTS", () => {
  it("are all hidden from the main worklist", () => {
    for (const a of EXAMPLE_WORKLIST_ACCOUNTS) expect(a.worklistHidden).toBe(true);
  });

  it("never collide with any other account by id, domain, or name", () => {
    // Each example account must appear exactly once in the merged fixture set —
    // a shared domain or name would surface it as a duplicate of a real account
    // and change the main worklist. (ACCOUNTS already includes the examples.)
    for (const a of EXAMPLE_WORKLIST_ACCOUNTS) {
      expect(ACCOUNTS.filter((x) => x.id === a.id)).toHaveLength(1);
      expect(ACCOUNTS.filter((x) => x.domain === a.domain)).toHaveLength(1);
      expect(ACCOUNTS.filter((x) => x.name === a.name)).toHaveLength(1);
    }
  });
});

describe("exampleWorklistId", () => {
  it("derives a globally-unique business id per user", () => {
    expect(exampleWorklistId("bms-upsell", "u-jade")).toBe("swl_example_bms-upsell_u-jade");
    expect(exampleWorklistId("bms-upsell", "u-jade")).not.toBe(
      exampleWorklistId("bms-upsell", "u-christina"),
    );
  });
});
