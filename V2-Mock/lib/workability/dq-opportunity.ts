import type { Opportunity } from "@/lib/salesforce/types";
import type { Team } from "@/lib/teams";

export const DQ_COOLING_OFF_DAYS = 30;

// Stages at or beyond which a disqualified opp triggers the cooling-off window.
const DISCOVERY_OR_LATER = ["discovery", "demo", "evaluation", "proposal", "negotiation"];

/** Human label for the XDR team that holds post-DQ ROE. */
function teamLabel(team: Team): string {
  return team === "SDR" ? "Inbound (SDR) team" : "Outbound (BDR) team";
}

export interface DqOppDetail {
  name: string;
  owner: string;
  furthestStage: string;
  closedDate: string | null;
  daysRemaining: number;
  /**
   * Who retains ROE for the 30-day post-DQ window: the sourcing XDR by name, or
   * the overall team (Inbound/Outbound) when that rep is no longer on the team.
   */
  roeHolder: string;
  /** "rep" when the sourcing XDR still holds ROE; "team" when it fell to the team. */
  roeHolderKind: "rep" | "team";
  /** ISO date the 30-day post-DQ ROE window ends (closed date + 30 days). */
  roeThroughDate: string | null;
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

export function reachedDiscovery(opp: Opportunity): boolean {
  const furthest = (opp.furthestStage ?? "").toLowerCase();
  return DISCOVERY_OR_LATER.some((s) => furthest.includes(s));
}

function daysSince(dateString: string, now: Date): number {
  const then = new Date(dateString).getTime();
  return (now.getTime() - then) / (1000 * 60 * 60 * 24);
}

/**
 * Resolve who holds ROE for the 30-day window after a DQ. Business rule (from
 * XDR management): the XDR who sourced the opp keeps ROE for 30 days after it's
 * DQ'd; if that rep is no longer on the team, the overall team (Inbound/SDR or
 * Outbound/BDR) holds it instead. Falls back to the opp creator/owner name when
 * the sourcing team isn't recorded (e.g. a non-XDR-sourced opp).
 */
function resolveRoeHolder(opp: Opportunity): { holder: string; kind: "rep" | "team" } {
  const repLeft = opp.sourcedRepActive === false;
  if (repLeft && opp.sourcedByTeam) {
    return { holder: teamLabel(opp.sourcedByTeam), kind: "team" };
  }
  return { holder: opp.createdBy ?? opp.ownerName, kind: "rep" };
}

function isoDatePlusDays(dateString: string, days: number): string {
  const d = new Date(dateString);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Disqualified-opportunity rule: a DQ'd opp does NOT make an account
 * unworkable, but ANY DQ'd opp on record flags it for review — there is a
 * disqualified-opportunity history the rep should read before re-working, so
 * the check and that history always agree. A still-within-cooling-off opp adds
 * the 30-day countdown; a cleared one (or one that never reached Discovery)
 * still reviews, just with a "clear to re-work — review the history" note.
 * PASS only when there was never a DQ'd opp (and so no history to show).
 *
 * ROE ownership (XDR management rule): for an opp still inside the 30-day
 * window, the sourcing XDR keeps ROE; if that rep has left the team, the overall
 * team (Inbound/SDR or Outbound/BDR) keeps it. The review reason names who holds
 * ROE and through what date so a re-working rep knows whose window it is.
 */
export function evaluateDqOpportunities(
  opportunities: Opportunity[],
  now: Date = new Date(),
): DqOppResult {
  const dqOpps = opportunities.filter(isDisqualified);

  if (dqOpps.length === 0) {
    return { status: "PASS", reason: "No disqualified opportunity on record", reviewOpportunities: [] };
  }

  // Opps still inside the 30-day cooling-off (reached Discovery) carry the
  // countdown; collect them for the detail/facts.
  const review: DqOppDetail[] = [];
  for (const opp of dqOpps) {
    const closed = opp.closedDate ?? opp.createdDate;
    const days = closed ? daysSince(closed, now) : Infinity;
    if (reachedDiscovery(opp) && days < DQ_COOLING_OFF_DAYS) {
      const { holder, kind } = resolveRoeHolder(opp);
      review.push({
        name: opp.name,
        owner: opp.ownerName,
        furthestStage: opp.furthestStage ?? opp.stage,
        closedDate: opp.closedDate ?? null,
        daysRemaining: Math.max(0, Math.ceil(DQ_COOLING_OFF_DAYS - days)),
        roeHolder: holder,
        roeHolderKind: kind,
        roeThroughDate: closed ? isoDatePlusDays(closed, DQ_COOLING_OFF_DAYS) : null,
      });
    }
  }

  let reason: string;
  if (review.length > 0) {
    const r = review[0];
    const closedDaysAgo = DQ_COOLING_OFF_DAYS - r.daysRemaining;
    const through = r.roeThroughDate ? new Date(r.roeThroughDate).toLocaleDateString() : null;
    const holds =
      r.roeHolderKind === "team"
        ? `${r.roeHolder} retains ROE (the sourcing rep has left the team)`
        : `${r.roeHolder} retains ROE`;
    reason = `Opp reached ${r.furthestStage}, DQ'd and closed ${closedDaysAgo} day${closedDaysAgo === 1 ? "" : "s"} ago — ${holds} for ${r.daysRemaining} more day${r.daysRemaining === 1 ? "" : "s"}${through ? ` (through ${through})` : ""}. Don't work it until the window clears.`;
  } else {
    const opp = dqOpps[0];
    const closed = opp.closedDate ?? null;
    const d = closed ? Math.floor(daysSince(closed, now)) : null;
    reason = reachedDiscovery(opp)
      ? `DQ'd opp reached ${opp.furthestStage ?? "Discovery"}, closed ${d !== null ? `${d} days ago ` : ""}— past the ${DQ_COOLING_OFF_DAYS}-day ROE window; review the DQ history before re-working`
      : `DQ'd opp closed ${d !== null ? `${d} days ago ` : ""}— never reached Discovery; review the DQ history before re-working`;
  }

  // Any DQ'd opp on record -> review (it has history worth reading).
  return { status: "REVIEW", reason, reviewOpportunities: review };
}
