import type { IntacctFields } from "@/lib/salesforce/types";

export interface PartnerResult {
  status: "PASS" | "FAIL";
  reason: string;
  varStatus: string | null;
}

/**
 * Partner / VAR check: an account with an active partner deal registration
 * (varStatus beginning "Registered") cannot be worked directly. A "Potential
 * VAR" note does not block.
 */
export function evaluatePartner(intacct: IntacctFields): PartnerResult {
  const varStatus = intacct.varStatus ?? null;

  if (varStatus && /^registered/i.test(varStatus)) {
    return {
      status: "FAIL",
      reason: `${varStatus} — active partner deal registration on this account`,
      varStatus,
    };
  }

  if (varStatus) {
    return {
      status: "PASS",
      reason: `VAR status "${varStatus}" — no active deal registration`,
      varStatus,
    };
  }

  return { status: "PASS", reason: "No partner or VAR relationship found", varStatus: null };
}
