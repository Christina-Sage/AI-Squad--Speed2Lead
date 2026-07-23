import type { SdrLead, LeadWorkabilityResult } from "@/lib/leads/types";
import type { AccountBundle } from "@/lib/salesforce/types";
import type { Team } from "@/lib/teams";
import type { LeadDuplicateInfo } from "@/lib/leads/lead-dedupe";
import {
  evaluateWorkability,
  type DedupeCheck,
  type FinalStatus,
} from "@/lib/workability/engine";
import { mostRecentCampaign } from "@/lib/salesforce/campaigns";

function chk(
  key: string,
  label: string,
  question: string,
  badgeType: "pf" | "yn",
  state: DedupeCheck["state"],
  reason: string,
  facts?: DedupeCheck["facts"],
): DedupeCheck {
  return { key, label, question, badgeType, state, reason, ...(facts ? { facts } : {}) };
}

// ABM/nurture statuses that mean the account is already being actively engaged,
// so the Account Association row surfaces the owner to coordinate with. Matched
// loosely so every "Interested (… months)" variant and "Inbound Working" count.
function statusShowsOwner(status: string | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes("working") || s.includes("nurture") || s.includes("interested");
}

// "YYYY-MM-DD (N days ago)" for an account's last activity; null when unset.
function formatAccountActivity(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (Number.isNaN(then.getTime())) return null;
  const days = Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24));
  const rel = days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
  return `${then.toISOString().slice(0, 10)} (${rel})`;
}

/**
 * Lead-level "Can I work it?" verdict (build-plan step 6). A lead-level version of
 * the six-check account verdict. Checks that depend on an account (association,
 * open opportunity, existing customer) read as "not applicable" rather than
 * failing when the lead has no linked account. Account-dependent checks are
 * derived from the linked account's own workability so the two stay in sync.
 */
export function evaluateLeadWorkability(
  lead: SdrLead,
  accountBundle: AccountBundle | null,
  team: Team = "SDR",
  duplicateInfo: LeadDuplicateInfo | null = null,
): LeadWorkabilityResult {
  const account = accountBundle?.account ?? null;
  const acct = accountBundle ? evaluateWorkability(accountBundle, team) : null;

  // 1. Duplicate check — a lead sharing a name or email with an earlier lead is
  // a duplicate and must not be worked (the original owns the record).
  const dup = duplicateInfo
    ? chk(
        "dup",
        "Duplicate Check",
        "Already a lead or contact in Salesforce?",
        "yn",
        "fail",
        `Duplicate of existing lead "${duplicateInfo.duplicateOf}" (same ${duplicateInfo.matchedOn})`,
      )
    : chk(
        "dup",
        "Duplicate Check",
        "Already a lead or contact in Salesforce?",
        "yn",
        "pass",
        "No matching lead or contact found in Salesforce",
      );

  // 2. Account association — a net-new SDR lead with no linked account has
  // nothing to reconcile, so this passes. When an account *is* linked, flag it
  // for review so the rep confirms the association (and the linked account's own
  // status) before working the lead.
  const assocQuestion = "Any account linked to this lead?";
  let assoc: DedupeCheck;
  if (!account || !acct) {
    assoc = chk(
      "assoc",
      "Account Association",
      assocQuestion,
      "pf",
      "pass",
      "No linked account on this lead — nothing to reconcile",
    );
  } else {
    // Break the evidence into scannable label/value chips instead of one long
    // sentence: Account, plus Owner/Status when the account is actively engaged
    // (Working / Nurture / Interested), plus Last activity when known.
    const engaged = statusShowsOwner(account.abmNurtureStatus);
    const activity = formatAccountActivity(account.lastActivityDate);
    const facts: NonNullable<DedupeCheck["facts"]> = [{ label: "Account", value: account.name }];
    if (engaged) {
      facts.push({ label: "Owner", value: account.ownerName });
      facts.push({ label: "Status", value: account.abmNurtureStatus! });
    }
    if (activity) facts.push({ label: "Last activity", value: activity });

    // Short action line; the chips carry the detail.
    const reason = engaged
      ? "Linked account is actively engaged — coordinate with the owner before working."
      : acct.final_status === "NOT WORKABLE"
        ? `Linked account is currently blocked: ${acct.reason}`
        : acct.final_status === "WORKABLE WITH REVIEW"
          ? "Linked account is workable with review — verify before working."
          : "Verify the linked account association before working.";
    assoc = chk("assoc", "Account Association", assocQuestion, "pf", "warn", reason, facts);
  }

  // 3. Ownership and ROE — is the lead or its account owned by someone else?
  const leadOwnedByOther = lead.ownerName !== "House Account";
  let roe: DedupeCheck;
  if (leadOwnedByOther) {
    roe = chk("roe", "Ownership & ROE", "Owned by another rep?", "pf", "fail", `Lead is owned by ${lead.ownerName}`);
  } else if (acct && acct.roe_status === "FAIL") {
    roe = chk("roe", "Ownership & ROE", "Owned by another rep?", "pf", "fail", `ROE conflict on ${account?.name}: ${acct.reason}`);
  } else if (acct) {
    roe = chk("roe", "Ownership & ROE", "Owned by another rep?", "pf", "pass", `Lead unassigned (House); no ROE conflict on the lead or ${account?.name}`);
  } else {
    roe = chk("roe", "Ownership & ROE", "Owned by another rep?", "pf", "pass", "Lead unassigned (House); account-level ROE not applicable");
  }

  // 4. Open opportunity on the linked account.
  let openOpp: DedupeCheck;
  if (!acct) {
    openOpp = chk("openOpp", "Open Opportunity", "Open opp on the linked account?", "yn", "na", "No linked account — check not applicable");
  } else if (acct.open_opportunity_status === "FAIL") {
    openOpp = chk("openOpp", "Open Opportunity", "Open opp on the linked account?", "yn", "fail", acct.open_opportunity_detail.openOpportunities[0]
      ? `Open opp: "${acct.open_opportunity_detail.openOpportunities[0].name}" on ${account?.name}`
      : `Open opportunity on ${account?.name}`);
  } else {
    openOpp = chk("openOpp", "Open Opportunity", "Open opp on the linked account?", "yn", "pass", `No open opportunity on ${account?.name}`);
  }

  // 5. Existing customer check on the linked account.
  let customer: DedupeCheck;
  if (!acct || !account) {
    customer = chk("customer", "Existing Customer", "Linked account already a customer?", "pf", "na", "No linked account — check not applicable");
  } else if (acct.customer_status === "BLOCKED") {
    customer = chk("customer", "Existing Customer", "Linked account already a customer?", "pf", "fail", `${account.name} is an existing customer — route to Customer Success`);
  } else if (acct.customer_status === "WARNING") {
    customer = chk("customer", "Existing Customer", "Linked account already a customer?", "pf", "warn", `${account.name} is a Customer with an expired TAM — verify before working`);
  } else {
    customer = chk("customer", "Existing Customer", "Linked account already a customer?", "pf", "pass", `${account.name} is a ${account.type} — not an existing customer`);
  }

  // 6. Suppression or cooling-off (uses the account DQ cooling-off when present).
  let suppression: DedupeCheck;
  if (acct && acct.dq_opportunity_status === "FAIL") {
    suppression = chk("suppression", "Suppression / Cooling-off", "Suppressed or in a cooling-off window?", "yn", "fail", acct.dq_opportunity_detail.reason);
  } else {
    suppression = chk("suppression", "Suppression / Cooling-off", "Suppressed or in a cooling-off window?", "yn", "pass", "No suppression flag or DQ cooling-off on this lead");
  }

  const checks: DedupeCheck[] = [dup, assoc, roe, openOpp, customer, suppression];

  const hasFail = checks.some((c) => c.state === "fail");
  const hasSoft = checks.some((c) => c.state === "warn" || c.state === "na");
  const final_status: FinalStatus = hasFail
    ? "NOT WORKABLE"
    : hasSoft
      ? "WORKABLE WITH REVIEW"
      : "WORKABLE";

  const { reason, recommendation } = buildLeadReason(final_status, lead, account?.name ?? null, checks);

  // Marketing campaign source: prefer the linked account's most recent campaign;
  // fall back to the lead's own capture source (web-form leads have no account).
  const marketing_campaign =
    mostRecentCampaign(account?.campaigns) ??
    (lead.source ? { name: lead.source, date: lead.createdAt ?? null } : null);

  return {
    lead_id: lead.id,
    name: lead.name,
    title: lead.title,
    account_id: lead.accountId,
    account_name: account?.name ?? null,
    domain: account?.domain ?? null,
    owner: lead.ownerName,
    status: lead.status,
    team,
    priority_group: lead.priorityGroup,
    final_status,
    reason,
    recommendation,
    marketing_campaign,
    checks,
  };
}

function buildLeadReason(
  finalStatus: FinalStatus,
  lead: SdrLead,
  accountName: string | null,
  checks: DedupeCheck[],
): { reason: string; recommendation: string } {
  if (finalStatus === "NOT WORKABLE") {
    const firstFail = checks.find((c) => c.state === "fail");
    return {
      reason: firstFail?.reason ?? "One or more lead checks failed.",
      recommendation: "Do not work this lead until the blocking issue is resolved.",
    };
  }
  if (finalStatus === "WORKABLE WITH REVIEW") {
    if (!lead.accountId) {
      return {
        reason:
          "This lead has no linked account, so two account-level checks (open opportunity, existing customer) could not run.",
        recommendation: "Confirm or create the account, then re-check before working the lead.",
      };
    }
    return {
      reason: `The linked account (${accountName}) is workable with review — verify it before working the lead.`,
      recommendation: "Review the account, then proceed.",
    };
  }
  return {
    reason:
      "No duplicate, the lead maps to a workable account, no ROE conflict, no open opportunity, and no suppression.",
    recommendation: "Lead is workable. Proceed.",
  };
}
