import { describe, it, expect } from "vitest";
import { EXAMPLE_SAVED_WORKLISTS, exampleWorklistId } from "@/lib/worklists/mock/example-worklists";
import { ACCOUNTS } from "@/lib/salesforce/mock/fixtures/accounts";

const ACCOUNT_IDS = new Set(ACCOUNTS.map((a) => a.id));

describe("EXAMPLE_SAVED_WORKLISTS", () => {
  it("defines the three example lists with unique keys", () => {
    const keys = EXAMPLE_SAVED_WORKLISTS.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(EXAMPLE_SAVED_WORKLISTS.map((w) => w.name)).toEqual([
      "Tradeshow — Money20/20",
      "ABX MV Dental",
      "BMS Upsell",
    ]);
  });

  it("selects only real, visible, de-duplicated seeded accounts", () => {
    for (const wl of EXAMPLE_SAVED_WORKLISTS) {
      expect(wl.accountIds.length).toBeGreaterThan(0);
      expect(new Set(wl.accountIds).size).toBe(wl.accountIds.length);
      for (const id of wl.accountIds) {
        expect(ACCOUNT_IDS.has(id)).toBe(true);
        expect(ACCOUNTS.find((a) => a.id === id)?.worklistHidden).toBeFalsy();
      }
    }
  });

  it("scopes the single-line lists to their product", () => {
    const bms = EXAMPLE_SAVED_WORKLISTS.find((w) => w.key === "bms-upsell")!;
    for (const id of bms.accountIds) {
      expect(ACCOUNTS.find((a) => a.id === id)?.product).toBe("BMS");
    }
    const dental = EXAMPLE_SAVED_WORKLISTS.find((w) => w.key === "abx-mv-dental")!;
    for (const id of dental.accountIds) {
      const acct = ACCOUNTS.find((a) => a.id === id);
      expect(acct?.product).toBe("Intacct");
      expect(acct?.industry).toBe("Healthcare");
    }
  });

  it("derives a globally-unique business id per user", () => {
    expect(exampleWorklistId("bms-upsell", "u-jade")).toBe("swl_example_bms-upsell_u-jade");
    expect(exampleWorklistId("bms-upsell", "u-jade")).not.toBe(
      exampleWorklistId("bms-upsell", "u-christina"),
    );
  });
});
