import { describe, it, expect } from "vitest";
import { buildExampleWorklistViews } from "@/lib/worklists/saved";
import {
  EXAMPLE_SAVED_WORKLISTS,
  EXAMPLE_WORKLIST_ID_PREFIX,
} from "@/lib/worklists/mock/example-worklists";

describe("buildExampleWorklistViews", () => {
  it("returns the three example lists as read-only, prefixed views", () => {
    const views = buildExampleWorklistViews();
    expect(views).toHaveLength(EXAMPLE_SAVED_WORKLISTS.length);
    expect(views.map((v) => v.name)).toEqual([
      "Tradeshow — Money20/20",
      "BMS Upsell",
      "ABX MV Dental",
    ]);
    for (const v of views) {
      expect(v.readOnly).toBe(true);
      expect(v.id.startsWith(EXAMPLE_WORKLIST_ID_PREFIX)).toBe(true);
      expect(v.archivedAt).toBeNull();
      expect(v.expiresAt).not.toBeNull();
    }
    // Ids are unique across the examples.
    expect(new Set(views.map((v) => v.id)).size).toBe(views.length);
  });

  it("reflects the pre-worked progress (3/12 and 10/12 active, 12/12 completed)", () => {
    const views = buildExampleWorklistViews();
    expect(
      views.map((v) => ({ worked: v.worked, total: v.total, status: v.status })),
    ).toEqual([
      { worked: 3, total: 12, status: "active" },
      { worked: 10, total: 12, status: "active" },
      { worked: 12, total: 12, status: "completed" },
    ]);
  });

  it("sorts the first-defined list newest (descending createdAt)", () => {
    const views = buildExampleWorklistViews();
    const times = views.map((v) => new Date(v.createdAt).getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1]).toBeGreaterThan(times[i]);
    }
  });
});
