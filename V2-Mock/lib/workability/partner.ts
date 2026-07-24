import type { IntacctFields } from "@/lib/salesforce/types";

export interface PartnerResult {
  /**
   * A partner relationship never blocks outright; an active deal registration
   * flags the account for review (coordinate with the channel), otherwise passes.
   */
  status: "PASS" | "REVIEW";
  reason: string;
  varStatus: string | null;
}

/**
 * Partner / VAR check: an account with an active partner deal registration
 * (varStatus beginning "Registered") should be reviewed and coordinated with
 * the channel team before working — it does not make the account unworkable.
 * A "Potential VAR" note does not flag anything.
 */
export function evaluatePartner(intacct: IntacctFields): PartnerResult {
  const varStatus = intacct.varStatus ?? null;

  if (varStatus && /^registered/i.test(varStatus)) {
    return {
      status: "REVIEW",
      reason: `${varStatus} — active partner deal registration; coordinate with the partner/channel team before working`,
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
