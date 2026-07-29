import type { Account } from "@/lib/salesforce/types";

export interface PartnerResult {
  /**
   * Any identified partner relationship flags the account for review — coordinate
   * with the channel before working. It never blocks outright.
   */
  status: "PASS" | "REVIEW";
  /** True when a partner/VAR relationship is identified in Intacct or Fusion. */
  hasRelationship: boolean;
  /** True for the hotter subset: a partner holds an active deal registration. */
  registered: boolean;
  /** Which system surfaced the relationship. */
  source: "Intacct" | "Fusion" | null;
  /** Partner / reseller name when it can be parsed. */
  partnerName: string | null;
  /** Raw Intacct VAR status, kept for existing consumers; null for Fusion-only. */
  varStatus: string | null;
  reason: string;
}

const PASS: PartnerResult = {
  status: "PASS",
  hasRelationship: false,
  registered: false,
  source: null,
  partnerName: null,
  varStatus: null,
  reason: "No partner or VAR relationship found.",
};

/** "Registered - Ridgeline Partners" / "Identified - CloudServe" -> the name. */
function partnerNameFrom(status: string): string | null {
  const dash = status.indexOf("-");
  const tail = dash >= 0 ? status.slice(dash + 1).trim() : "";
  return tail.length > 0 ? tail : null;
}

/**
 * Partner / VAR check. Any partner relationship identified in Salesforce Intacct
 * (varStatus) or Sage Fusion (partnerStatus) flags the account as In Review, so
 * the BDR coordinates with the partner/channel team before working it — roughly
 * 30% of a BDR's accounts. An active deal registration ("Registered …") is the
 * hotter subset and is labelled as such; it still reviews rather than blocks.
 */
export function evaluatePartner(account: Account): PartnerResult {
  const varStatus = account.intacct.varStatus ?? null;
  if (varStatus) {
    const registered = /^registered/i.test(varStatus);
    return {
      status: "REVIEW",
      hasRelationship: true,
      registered,
      source: "Intacct",
      partnerName: partnerNameFrom(varStatus),
      varStatus,
      reason: registered
        ? `${varStatus} — a partner holds an active deal registration; coordinate with the partner/channel team before working.`
        : `Partner relationship in Intacct (${varStatus}) — coordinate with the partner/channel team before working.`,
    };
  }

  const fusion = account.fusion?.partnerStatus ?? null;
  if (fusion) {
    const registered = /^registered/i.test(fusion);
    return {
      status: "REVIEW",
      hasRelationship: true,
      registered,
      source: "Fusion",
      partnerName: partnerNameFrom(fusion),
      varStatus: null,
      reason: registered
        ? `${fusion} — a partner holds an active deal registration in Fusion; coordinate with the partner/channel team before working.`
        : `Partner relationship in Fusion (${fusion}) — coordinate with the partner/channel team before working.`,
    };
  }

  return PASS;
}
