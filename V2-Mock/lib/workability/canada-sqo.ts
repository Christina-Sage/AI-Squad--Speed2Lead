import type { Account, Opportunity } from "@/lib/salesforce/types";
import type { Team } from "@/lib/teams";

/**
 * Canada-only SQO cool-down: in Canada an XDR can't be paid for an SQO if
 * another XDR was already paid for an SQO on the same account within the last
 * 180 days. 6 months.
 */
export const CANADA_SQO_WINDOW_DAYS = 180;

export interface CanadaSqoConflict {
  /** The prior XDR-sourced opp that earned SQO credit. */
  name: string;
  /** Who was credited: the sourcing XDR by name, or the team if that rep has left. */
  creditedTo: string;
  /** "rep" when the sourcing XDR is credited; "team" when it fell to the team. */
  creditedKind: "rep" | "team";
  /** ISO date the prior opp became an SQO. */
  sqoDate: string;
  /** Whole days since that prior XDR-sourced SQO. */
  daysSince: number;
  /** ISO date the 180-day window clears (sqoDate + 180 days). */
  windowClearsDate: string;
  /** Whole days until the 180-day window clears. */
  daysUntilClear: number;
}

export interface CanadaSqoResult {
  /**
   * PASS — rule doesn't apply (not a Canada account) or no XDR-sourced SQO in
   * the last 180 days. REVIEW — a conflict exists but exceptions are allowed
   * (inbound/SDR). FAIL — a conflict blocks (outbound/BDR).
   */
  status: "PASS" | "REVIEW" | "FAIL";
  /** True when the account is in scope for the rule (Canada). */
  applies: boolean;
  reason: string;
  /** The most-recent conflicting XDR-sourced SQO, when one exists. */
  conflict: CanadaSqoConflict | null;
}

export function isCanada(account: Pick<Account, "country">): boolean {
  const c = (account.country ?? "").trim().toLowerCase();
  return c === "canada" || c === "ca";
}

function wholeDaysBetween(from: string, now: Date): number {
  const then = new Date(from).getTime();
  return Math.floor((now.getTime() - then) / (1000 * 60 * 60 * 24));
}

function isoDatePlusDays(dateString: string, days: number): string {
  const d = new Date(dateString);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * An opp counts toward the rule only when an XDR sourced it (sourcedByTeam set)
 * AND it earned SQO credit (sqoDate set). AE/CE self-sourced opps don't count —
 * AEs/CEs aren't paid on SQOs, so a prior non-XDR-sourced SQO is irrelevant.
 */
function xdrSqoCredit(opp: Opportunity): boolean {
  return Boolean(opp.sourcedByTeam) && Boolean(opp.sqoDate);
}

/**
 * Canada 180-day XDR-sourced-SQO rule. Only applies to Canadian accounts. When
 * another XDR was paid for an SQO on the same account within 180 days:
 *   - Inbound (SDR): REVIEW — exceptions can be made, so surface it for a human
 *     decision rather than blocking by de-dupe. It's still important to know how
 *     long it's been since the last XDR-sourced SQO, so the reason carries that.
 *   - Outbound (BDR): FAIL — block by de-dupe.
 * A prior non-XDR-sourced SQO (AE/CE deal) does not count.
 */
export function evaluateCanadaSqo(
  account: Account,
  opportunities: Opportunity[],
  team: Team,
  now: Date = new Date(),
): CanadaSqoResult {
  if (!isCanada(account)) {
    return {
      status: "PASS",
      applies: false,
      reason: "Not a Canadian account — the 180-day SQO rule does not apply",
      conflict: null,
    };
  }

  // XDR-sourced SQOs on this account inside the 180-day window, most recent first.
  const recent = opportunities
    .filter(xdrSqoCredit)
    .map((opp) => ({ opp, days: wholeDaysBetween(opp.sqoDate as string, now) }))
    .filter(({ days }) => days >= 0 && days < CANADA_SQO_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days);

  if (recent.length === 0) {
    return {
      status: "PASS",
      applies: true,
      reason: `Canada: no XDR-sourced SQO on this account in the last ${CANADA_SQO_WINDOW_DAYS} days — clear to work`,
      conflict: null,
    };
  }

  const { opp, days } = recent[0];
  const sqoDate = opp.sqoDate as string;
  const repLeft = opp.sourcedRepActive === false;
  const creditedKind: "rep" | "team" = repLeft ? "team" : "rep";
  const creditedTo = repLeft
    ? opp.sourcedByTeam === "SDR"
      ? "Inbound (SDR) team"
      : "Outbound (BDR) team"
    : opp.createdBy ?? opp.ownerName;
  const windowClearsDate = isoDatePlusDays(sqoDate, CANADA_SQO_WINDOW_DAYS);
  const daysUntilClear = Math.max(0, CANADA_SQO_WINDOW_DAYS - days);

  const conflict: CanadaSqoConflict = {
    name: opp.name,
    creditedTo,
    creditedKind,
    sqoDate,
    daysSince: days,
    windowClearsDate,
    daysUntilClear,
  };

  const clears = new Date(windowClearsDate).toLocaleDateString();
  const base = `Canada: ${creditedTo} was paid for an XDR-sourced SQO on this account ${days} day${days === 1 ? "" : "s"} ago ("${opp.name}") — within the ${CANADA_SQO_WINDOW_DAYS}-day window (clears ${clears}, ${daysUntilClear} day${daysUntilClear === 1 ? "" : "s"} left).`;

  if (team === "SDR") {
    return {
      status: "REVIEW",
      applies: true,
      reason: `${base} Inbound: exceptions can be made — review before working.`,
      conflict,
    };
  }

  return {
    status: "FAIL",
    applies: true,
    reason: `${base} Outbound: blocked by de-dupe — a second XDR SQO can't be paid inside the window.`,
    conflict,
  };
}
