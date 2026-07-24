import type { Opportunity } from "@/lib/salesforce/types";

export const DQ_COOLING_OFF_DAYS = 30;

// Stages at or beyond which a disqualified opp triggers the cooling-off window.
const DISCOVERY_OR_LATER = ["discovery", "demo", "evaluation", "proposal", "negotiation"];

export interface DqOppDetail {
  name: string;
  owner: string;
  furthestStage: string;
  closedDate: string | null;
  daysRemaining: number;
}

export interface DqOppResult {
  /**
   * A disqualified opp never blocks outright; a recent one (closed within the
   * 30-day cooling-off) flags the account for review, otherwise it passes.
   */
  status: "PASS" | "REVIEW";
  /** Human-readable evidence for the check row. */
  reason: string;
  reviewOpportunities: DqOppDetail[];
}

function isDisqualified(opp: Opportunity): boolean {
  const stage = opp.stage.toLowerCase();
  return opp.isClosed && (stage.includes("disqualified") || stage.includes("closed lost"));
}

function reachedDiscovery(opp: Opportunity): boolean {
  const furthest = (opp.furthestStage ?? "").toLowerCase();
  return DISCOVERY_OR_LATER.some((s) => furthest.includes(s));
}

function daysSince(dateString: string, now: Date): number {
  const then = new Date(dateString).getTime();
  return (now.getTime() - then) / (1000 * 60 * 60 * 24);
}

/**
 * Disqualified-opportunity rule: a DQ'd opp does NOT make an account
 * unworkable. It only flags the account for review while the opp is still
 * within the 30-day cooling-off after close (and only if it reached Discovery
 * or later). Once the opp has been closed for 30+ days — or never reached
 * Discovery — the account is clear to re-work.
 */
export function evaluateDqOpportunities(
  opportunities: Opportunity[],
  now: Date = new Date(),
): DqOppResult {
  const dqOpps = opportunities.filter(isDisqualified);

  if (dqOpps.length === 0) {
    return { status: "PASS", reason: "No disqualified opportunity on record", reviewOpportunities: [] };
  }

  const review: DqOppDetail[] = [];
  let clearNote: string | null = null;

  for (const opp of dqOpps) {
    const closed = opp.closedDate ?? opp.createdDate;
    const days = closed ? daysSince(closed, now) : Infinity;

    if (reachedDiscovery(opp) && days < DQ_COOLING_OFF_DAYS) {
      review.push({
        name: opp.name,
        owner: opp.ownerName,
        furthestStage: opp.furthestStage ?? opp.stage,
        closedDate: opp.closedDate ?? null,
        daysRemaining: Math.max(0, Math.ceil(DQ_COOLING_OFF_DAYS - days)),
      });
    } else {
      const d = Number.isFinite(days) ? Math.floor(days) : null;
      clearNote = reachedDiscovery(opp)
        ? `DQ'd opp reached ${opp.furthestStage ?? "Discovery"} but has been closed ${d}+ days (past the ${DQ_COOLING_OFF_DAYS}-day cooling-off) — clear to re-work`
        : `DQ'd ${d !== null ? `${d} days ago ` : ""}and never reached Discovery — clear to re-work`;
    }
  }

  if (review.length > 0) {
    const r = review[0];
    const closedDaysAgo = DQ_COOLING_OFF_DAYS - r.daysRemaining;
    return {
      status: "REVIEW",
      reason: `Opp reached ${r.furthestStage}, DQ'd and closed ${closedDaysAgo} day${closedDaysAgo === 1 ? "" : "s"} ago — verify it has been closed ${DQ_COOLING_OFF_DAYS} days before re-working (${r.daysRemaining} day${r.daysRemaining === 1 ? "" : "s"} left)`,
      reviewOpportunities: review,
    };
  }

  return {
    status: "PASS",
    reason: clearNote ?? "No disqualified opportunity within the cooling-off window",
    reviewOpportunities: [],
  };
}
