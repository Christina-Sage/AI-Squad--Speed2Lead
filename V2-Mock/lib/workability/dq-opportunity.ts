import type { Opportunity } from "@/lib/salesforce/types";

export const DQ_COOLING_OFF_MONTHS = 6;

// Stages at or beyond which a disqualified opp triggers the cooling-off window.
const DISCOVERY_OR_LATER = ["discovery", "demo", "evaluation", "proposal", "negotiation"];

export interface DqOppDetail {
  name: string;
  owner: string;
  furthestStage: string;
  closedDate: string | null;
  monthsRemaining: number;
}

export interface DqOppResult {
  status: "PASS" | "FAIL";
  /** Human-readable evidence for the check row. */
  reason: string;
  blockingOpportunities: DqOppDetail[];
}

function isDisqualified(opp: Opportunity): boolean {
  const stage = opp.stage.toLowerCase();
  return opp.isClosed && (stage.includes("disqualified") || stage.includes("closed lost"));
}

function reachedDiscovery(opp: Opportunity): boolean {
  const furthest = (opp.furthestStage ?? "").toLowerCase();
  return DISCOVERY_OR_LATER.some((s) => furthest.includes(s));
}

function monthsSince(dateString: string, now: Date): number {
  const then = new Date(dateString).getTime();
  return (now.getTime() - then) / (1000 * 60 * 60 * 24 * 30.44);
}

/**
 * Disqualified-opportunity rule: a DQ'd opp that reached Discovery (or later)
 * blocks the account for six months after close. A DQ'd opp that never reached
 * Discovery does not block — the account is immediately eligible to re-work.
 */
export function evaluateDqOpportunities(
  opportunities: Opportunity[],
  now: Date = new Date(),
): DqOppResult {
  const dqOpps = opportunities.filter(isDisqualified);

  if (dqOpps.length === 0) {
    return { status: "PASS", reason: "No disqualified opportunity on record", blockingOpportunities: [] };
  }

  const blocking: DqOppDetail[] = [];
  let eligibleNote: string | null = null;

  for (const opp of dqOpps) {
    const closed = opp.closedDate ?? opp.createdDate;
    const months = closed ? monthsSince(closed, now) : Infinity;

    if (reachedDiscovery(opp)) {
      if (months < DQ_COOLING_OFF_MONTHS) {
        blocking.push({
          name: opp.name,
          owner: opp.ownerName,
          furthestStage: opp.furthestStage ?? opp.stage,
          closedDate: opp.closedDate ?? null,
          monthsRemaining: Math.max(0, Math.ceil(DQ_COOLING_OFF_MONTHS - months)),
        });
      } else {
        eligibleNote = `DQ'd opp reached ${opp.furthestStage ?? "Discovery"} but the ${DQ_COOLING_OFF_MONTHS}-month cooling-off has passed — eligible to re-work`;
      }
    } else {
      const days = closed ? Math.floor(monthsSince(closed, now) * 30.44) : null;
      eligibleNote = `DQ'd ${days !== null ? `${days} days ago ` : ""}and never reached Discovery — eligible to re-work`;
    }
  }

  if (blocking.length > 0) {
    const b = blocking[0];
    return {
      status: "FAIL",
      reason: `Opp reached ${b.furthestStage}, DQ'd — must wait ${DQ_COOLING_OFF_MONTHS} months post-close (${b.monthsRemaining} month${b.monthsRemaining === 1 ? "" : "s"} left)`,
      blockingOpportunities: blocking,
    };
  }

  return {
    status: "PASS",
    reason: eligibleNote ?? "No blocking disqualified opportunity",
    blockingOpportunities: [],
  };
}
