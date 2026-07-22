import { describe, expect, it } from "vitest";
import { computeDuplicateLeads, duplicateInfoFor } from "@/lib/leads/lead-dedupe";

describe("computeDuplicateLeads", () => {
  it("flags the later lead when two share a name", () => {
    const dups = computeDuplicateLeads([
      { id: "a", name: "Peter Pan", email: "peter@neverland.com", createdAt: "2026-07-22T10:00:00Z" },
      { id: "b", name: "peter pan", email: "different@x.com", createdAt: "2026-07-22T11:00:00Z" },
    ]);
    expect(dups.has("a")).toBe(false);
    expect(dups.get("b")).toEqual({ duplicateOf: "Peter Pan", matchedOn: "name" });
  });

  it("flags the later lead when two share an email but differ in name", () => {
    const dups = computeDuplicateLeads([
      { id: "a", name: "Jane Doe", email: "shared@corp.com", createdAt: "2026-07-22T10:00:00Z" },
      { id: "b", name: "J. Doe", email: "SHARED@corp.com", createdAt: "2026-07-22T11:00:00Z" },
    ]);
    expect(dups.get("b")).toEqual({ duplicateOf: "Jane Doe", matchedOn: "email" });
  });

  it("leaves unique leads unflagged", () => {
    const dups = computeDuplicateLeads([
      { id: "a", name: "Alice", email: "alice@x.com" },
      { id: "b", name: "Bob", email: "bob@x.com" },
    ]);
    expect(dups.size).toBe(0);
  });

  it("treats a fixture lead (no createdAt) as the original over a captured duplicate", () => {
    const info = duplicateInfoFor("captured", [
      { id: "captured", name: "Sarah Chen", email: "sarah@new.com", createdAt: "2026-07-22T10:00:00Z" },
      { id: "fixture", name: "Sarah Chen", email: null, createdAt: null },
    ]);
    expect(info).toEqual({ duplicateOf: "Sarah Chen", matchedOn: "name" });
  });
});
