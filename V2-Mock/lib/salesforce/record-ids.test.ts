import { describe, expect, it } from "vitest";
import { intacctId, leadRecordId, fusionId } from "@/lib/salesforce/record-ids";

describe("record display IDs", () => {
  it("Intacct ID starts with 001 and is 18 chars", () => {
    for (const seed of ["0015Y00000ACME01", "0015Y00002ABC123", "x", "0015Y00000HLCN012345"]) {
      const id = intacctId(seed);
      expect(id).toMatch(/^001/);
      expect(id).toHaveLength(18);
    }
  });

  it("Lead ID starts with 00Q and is 18 chars", () => {
    for (const seed of ["00Q5Y00000SARAH1", "00Q5Y00000GRACE1", "y"]) {
      const id = leadRecordId(seed);
      expect(id).toMatch(/^00Q/);
      expect(id).toHaveLength(18);
    }
  });

  it("Fusion ID starts with 400, is 10 chars, and is numeric only", () => {
    for (const seed of ["0015Y00000ACME01", "z"]) {
      const id = fusionId(seed);
      expect(id).toMatch(/^400/);
      expect(id).toHaveLength(10);
      // Numeric only — no letters (distinguishes Fusion ids from Intacct ids).
      expect(id).toMatch(/^\d{10}$/);
    }
  });

  it("is deterministic for a given seed", () => {
    expect(fusionId("0015Y00000ACME01")).toBe(fusionId("0015Y00000ACME01"));
    expect(intacctId("abc")).toBe(intacctId("abc"));
  });
});
