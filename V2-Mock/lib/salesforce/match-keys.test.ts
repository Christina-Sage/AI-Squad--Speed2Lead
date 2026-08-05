import { describe, expect, it } from "vitest";
import { isFusionAccountId, normalizeDomain, normalizeEmailDomain } from "./match-keys";

describe("normalizeEmailDomain", () => {
  it("keeps the part after @, lowercased", () => {
    expect(normalizeEmailDomain("Jane.Doe@ACME.com")).toBe("acme.com");
  });
  it("uses the last @ for odd inputs", () => {
    expect(normalizeEmailDomain("weird@name@acme.com")).toBe("acme.com");
  });
  it("trims whitespace and trailing dots", () => {
    expect(normalizeEmailDomain("  jane@acme.com.  ")).toBe("acme.com");
  });
  it("returns null when there is no @ or no domain", () => {
    expect(normalizeEmailDomain("jane.acme.com")).toBeNull();
    expect(normalizeEmailDomain("jane@")).toBeNull();
    expect(normalizeEmailDomain(null)).toBeNull();
    expect(normalizeEmailDomain(undefined)).toBeNull();
  });
});

describe("normalizeDomain", () => {
  it("delegates emails to the post-@ rule", () => {
    expect(normalizeDomain("jane@acme.com")).toBe("acme.com");
  });
  it("reduces a website URL to a bare host", () => {
    expect(normalizeDomain("https://www.ACME.com/contact?x=1")).toBe("acme.com");
    expect(normalizeDomain("http://acme.com")).toBe("acme.com");
    expect(normalizeDomain("www.acme.co.uk")).toBe("acme.co.uk");
  });
  it("returns null for empty / nullish input", () => {
    expect(normalizeDomain("   ")).toBeNull();
    expect(normalizeDomain(null)).toBeNull();
  });
});

describe("isFusionAccountId", () => {
  it("accepts the confirmed 10-digit 400-prefixed shape", () => {
    expect(isFusionAccountId("4008730981")).toBe(true);
    expect(isFusionAccountId(" 4000000000 ")).toBe(true);
  });
  it("rejects non-Fusion shapes", () => {
    expect(isFusionAccountId("0015Y00000ACME01")).toBe(false); // GMO global id
    expect(isFusionAccountId("400873098")).toBe(false); // 9 digits — too short
    expect(isFusionAccountId("40087309812")).toBe(false); // 11 digits — too long
    expect(isFusionAccountId("40087309a1")).toBe(false);
    expect(isFusionAccountId(null)).toBe(false);
  });
});
