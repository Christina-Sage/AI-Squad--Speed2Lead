import { describe, expect, it } from "vitest";
import { matchesIcp } from "@/lib/research/icp";

describe("matchesIcp", () => {
  it.each([
    "Director of Finance",
    "Director of Accounting",
    "Controller",
    "Director of Development",
    "Director of Technology",
    "Chief Financial Officer",
    "VP of Finance",
    "Senior Accountant",
    "Accounts Payable Manager",
    "Cfo",
    "CFO",
    "Senior Director Of Finance",
  ])("matches %s", (title) => {
    expect(matchesIcp(title)).toBe(true);
  });

  it.each(["Board Member", "President & CEO", "Chief Marketing Officer", "Receptionist", ""])(
    "does not match %s",
    (title) => {
      expect(matchesIcp(title)).toBe(false);
    },
  );
});
