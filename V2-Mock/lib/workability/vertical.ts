import type { Account } from "@/lib/salesforce/types";

export const WRONG_VERTICAL = "WRONG_VERTICAL";

export interface VerticalResult {
  /** REVIEW never blocks on its own here; the engine decides how to weight it. */
  status: "PASS" | "WRONG_VERTICAL";
  reason: string;
}

// Construction-industry signals. An account whose industry reads as construction
// belongs to the CRE team; worked under any other segment it's in the wrong
// vertical (outbound de-dupe: set nurture status = Incorrect Vertical, note CRE).
const CONSTRUCTION = /construction|contractor|real estate|\bAEC\b|\bCRE\b/i;

/**
 * Wrong-vertical check (outbound). A construction-industry account being worked
 * as a non-CRE product is in the wrong vertical — it should route to the CRE
 * team, not be worked here. Segment `CRE` is exempt (that's the right vertical).
 */
export function evaluateVertical(account: Account): VerticalResult {
  if (account.product !== "CRE" && CONSTRUCTION.test(account.industry)) {
    return {
      status: "WRONG_VERTICAL",
      reason: `Industry "${account.industry}" is construction — belongs to the CRE team, not the ${account.product} segment. Route to CRE.`,
    };
  }
  return { status: "PASS", reason: `Industry "${account.industry}" — correct vertical for ${account.product}.` };
}
