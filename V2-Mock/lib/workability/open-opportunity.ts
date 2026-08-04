import type { IntacctFields, Opportunity } from "@/lib/salesforce/types";
import type { Team } from "@/lib/teams";

export interface OpenOpportunityDetail {
  source: "Salesforce" | "Intacct";
  name: string;
  /** AE/CE who owns the opp. */
  owner: string;
  /** Rep or AE/CE who created (sourced) the opp — falls back to the owner. */
  createdBy: string;
  stage: string;
  createdDate: string;
}

export interface OpenOppResult {
  /**
   * PASS — no open opp. FAIL — a recent open opp hard-blocks (active deal).
   * REVIEW — the account is workable with review; a rep can ask the AE/CE to DQ
   * the opp and re-engage. Inbound (SDR) always downgrades an open opp to
   * REVIEW; outbound (BDR) only once every open opp is older than the 12-month
   * stale window.
   */
  status: "PASS" | "REVIEW" | "FAIL";
  openOpportunities: OpenOpportunityDetail[];
}

/**
 * Age window after which an open opportunity is considered stale. Within the
 * window an open opp still hard-blocks (FAIL); past it, the Open Opportunity
 * check downgrades to REVIEW — old deals can be disqualified so the account can
 * be re-engaged. 12 months.
 */
export const OPEN_OPP_STALE_AFTER_DAYS = 365;

/**
 * Age in whole days from an opp's created date; null when the date is missing
 * or unparseable (e.g. the Intacct fallback detail carries no date).
 */
export function opportunityAgeDays(createdDate: string): number | null {
  if (!createdDate) return null;
  const then = new Date(createdDate);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Human-friendly age of an open opportunity — surfaced as an "Age" fact on the
 * Open Opportunity check. Always expressed in days. Returns "Unknown" when the
 * created date is missing or unparseable.
 */
export function opportunityAge(createdDate: string): string {
  const days = opportunityAgeDays(createdDate);
  if (days === null) return "Unknown";
  if (days <= 0) return "today";
  return days === 1 ? "1 day" : `${days} days`;
}

export function evaluateOpenOpportunities(
  opportunities: Opportunity[],
  intacct: IntacctFields,
  team: Team = "BDR",
): OpenOppResult {
  const openOpportunities: OpenOpportunityDetail[] = [];

  for (const opp of opportunities) {
    if (!opp.isClosed) {
      openOpportunities.push({
        source: "Salesforce",
        name: opp.name,
        owner: opp.ownerName,
        createdBy: opp.createdBy ?? opp.ownerName,
        stage: opp.stage,
        createdDate: opp.createdDate,
      });
    }
  }

  // Open-opp reads are product-agnostic across the systems that hold opps: GMO
  // (above) and Intacct SF (for Intacct-SF products). Fusion has no opps, so
  // non-Intacct products' opps are all in GMO.
  if (intacct.hasOpenOpps) {
    for (const detail of intacct.openOppDetails ?? []) {
      openOpportunities.push({
        source: "Intacct",
        name: detail.name,
        owner: detail.owner,
        createdBy: detail.createdBy ?? detail.owner,
        stage: detail.stage,
        createdDate: detail.createdDate,
      });
    }
    if ((intacct.openOppDetails ?? []).length === 0) {
      openOpportunities.push({
        source: "Intacct",
        name: "Open Opportunity (Intacct)",
        owner: "Unknown",
        createdBy: "Unknown",
        stage: "Open",
        createdDate: "",
      });
    }
  }

  if (openOpportunities.length === 0) {
    return { status: "PASS", openOpportunities };
  }

  // Inbound (SDR): an open opp never hard-blocks — always workable with review.
  if (team === "SDR") {
    return { status: "REVIEW", openOpportunities };
  }

  // Outbound (BDR): a recent (or unknown-age) open opp still hard-blocks — it's
  // an active deal. Only when EVERY open opp is older than the stale window do
  // we downgrade to REVIEW, so a rep can ask the AE/CE to DQ it and re-engage.
  const anyBlocking = openOpportunities.some((o) => {
    const days = opportunityAgeDays(o.createdDate);
    return days === null || days <= OPEN_OPP_STALE_AFTER_DAYS;
  });

  return {
    status: anyBlocking ? "FAIL" : "REVIEW",
    openOpportunities,
  };
}
