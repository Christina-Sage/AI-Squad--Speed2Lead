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
import { isExpiredTam } from "@/lib/workability/customer-tam";
import { buildSalesforceAccountUrl } from "@/lib/salesforce/urls";
import { companyDomainFromEmail } from "@/lib/leads/email-domains";

function chk(
  key: string,
  label: string,
  question: string,
  badgeType: "pf" | "yn",
  state: DedupeCheck["state"],
  reason: string,
  facts?: DedupeCheck["facts"],
  href?: string,
): DedupeCheck {
  return {
    key,
    label,
    question,
    badgeType,
    state,
    reason,
    ...(facts ? { facts } : {}),
    ...(href ? { href } : {}),
  };
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
 * Lead-level "Can I work it?" verdict (build-plan step 6). Mirrors the BDR
 * account checklist (Customer Status, TAM, ROE, Open Opportunity, Disqualified
 * Opportunity, Partner Relationship) with an SDR-only Account Association check
 * and a lead-level Duplicate Lead check. Account-dependent checks are derived
 * from the linked account's own workability so the two stay in sync, and read
 * "not applicable" rather than failing when the lead has no linked account.
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
        "Duplicate Lead",
        "Any duplicate lead records?",
        "yn",
        "fail",
        `Duplicate of existing lead "${duplicateInfo.duplicateOf}" (same ${duplicateInfo.matchedOn})`,
      )
    : chk(
        "dup",
        "Duplicate Lead",
        "Any duplicate lead records?",
        "yn",
        "pass",
        "No duplicate lead found — name and email are unique",
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
    // The badge links straight to the associated account in Salesforce.
    assoc = chk(
      "assoc",
      "Account Association",
      assocQuestion,
      "pf",
      "warn",
      reason,
      facts,
      buildSalesforceAccountUrl(account.id),
    );
  }

  // 3. ROE — is the lead or its account owned by / in conflict with another rep?
  const leadOwnedByOther = lead.ownerName !== "House Account";
  const roeQuestion = "Any lead/contact conflict with another rep?";
  let roe: DedupeCheck;
  if (leadOwnedByOther) {
    roe = chk("roe", "ROE", roeQuestion, "pf", "fail", `Lead is owned by ${lead.ownerName}`);
  } else if (acct && acct.roe_status === "FAIL") {
    roe = chk("roe", "ROE", roeQuestion, "pf", "fail", `ROE conflict on ${account?.name}: ${acct.reason}`);
  } else if (acct) {
    roe = chk("roe", "ROE", roeQuestion, "pf", "pass", `Lead unassigned (House); no owner conflict on the lead or ${account?.name}`);
  } else {
    roe = chk("roe", "ROE", roeQuestion, "pf", "pass", "Lead unassigned (House); account-level ROE not applicable");
  }

  // 3b. TAM — does the linked account fall within team territory? Mirrors the
  // BDR TAM check; warns on an expired Intacct TAM, N/A without a linked account.
  let tam: DedupeCheck;
  const tamQuestion = "Does the account fall within your territory?";
  if (!account || !acct) {
    tam = chk("tam", "TAM", tamQuestion, "pf", "na", "No linked account — territory can't be validated");
  } else if (isExpiredTam(account.tam) && acct.customer_status === "PASS") {
    tam = chk("tam", "TAM", tamQuestion, "pf", "warn", `TAM: ${account.tam} on ${account.name} — verify before working`);
  } else {
    tam = chk(
      "tam",
      "TAM",
      tamQuestion,
      "pf",
      "pass",
      account.tam === null ? "TAM: Blank — falls within team territory" : `TAM: ${account.tam}`,
    );
  }

  // 4. Open opportunity on the linked account.
  const openOppQuestion = "Does an open opp already exist?";
  let openOpp: DedupeCheck;
  if (!acct) {
    openOpp = chk("openOpp", "Open Opportunity", openOppQuestion, "pf", "na", "No linked account — check not applicable");
  } else if (acct.open_opportunity_status === "FAIL") {
    openOpp = chk("openOpp", "Open Opportunity", openOppQuestion, "pf", "fail", acct.open_opportunity_detail.openOpportunities[0]
      ? `Open opp: "${acct.open_opportunity_detail.openOpportunities[0].name}" on ${account?.name}`
      : `Open opportunity on ${account?.name}`);
  } else {
    openOpp = chk("openOpp", "Open Opportunity", openOppQuestion, "pf", "pass", `No open opportunity on ${account?.name}`);
  }

  // 5. Customer status of the linked account (is this a prospect, not a customer?).
  const customerQuestion = "Is this a prospect (not an existing customer)?";
  let customer: DedupeCheck;
  if (!acct || !account) {
    customer = chk("customer", "Customer Status", customerQuestion, "pf", "na", "No linked account — check not applicable");
  } else if (acct.customer_status === "BLOCKED") {
    customer = chk("customer", "Customer Status", customerQuestion, "pf", "fail", `${account.name} is an existing customer — route to Customer Success`);
  } else if (acct.customer_status === "WARNING") {
    customer = chk("customer", "Customer Status", customerQuestion, "pf", "warn", `${account.name} is a Customer with an expired TAM — verify before working`);
  } else {
    customer = chk("customer", "Customer Status", customerQuestion, "pf", "pass", `${account.name} is a ${account.type} — not an existing customer`);
  }

  // 6. Disqualified opportunity — a recently-closed DQ opp on the linked account
  // flags the lead for review (not a hard block). Mirrors the BDR check.
  const dqQuestion = "Blocking DQ opp?";
  let dqOpp: DedupeCheck;
  if (acct && acct.dq_opportunity_status === "REVIEW") {
    dqOpp = chk("dqOpp", "Disqualified Opportunity", dqQuestion, "yn", "warn", acct.dq_opportunity_detail.reason);
  } else {
    dqOpp = chk("dqOpp", "Disqualified Opportunity", dqQuestion, "yn", "pass", "No disqualified opportunity within the cooling-off window");
  }

  // 7. Partner relationship — flags for review (coordinate with the channel)
  // when the linked account has an active deal registration OR the lead itself
  // came in through a VAR. It does not make the lead unworkable.
  const partnerQuestion = "Partner conflict found?";
  const varLead = /\bVAR\b|reseller|value[- ]?added/i.test(lead.source ?? "");
  let partner: DedupeCheck;
  if (acct && acct.partner_status === "REVIEW") {
    partner = chk(
      "partner",
      "Partner Relationship",
      partnerQuestion,
      "yn",
      "warn",
      `${acct.partner_detail.varStatus ?? "Partner deal registration"} — a partner holds an active deal registration on ${account?.name}. Coordinate with the partner/channel team.`,
    );
  } else if (varLead) {
    partner = chk(
      "partner",
      "Partner Relationship",
      partnerQuestion,
      "yn",
      "warn",
      `Lead came in through a VAR (${lead.source}) — coordinate with the partner/channel team.`,
    );
  } else if (acct) {
    partner = chk("partner", "Partner Relationship", partnerQuestion, "yn", "pass", `No partner or VAR relationship on ${account?.name}`);
  } else {
    partner = chk("partner", "Partner Relationship", partnerQuestion, "yn", "pass", "No partner or VAR relationship found");
  }

  // Ordered to mirror the BDR account checklist, with the SDR-only Account
  // Association slotted in after the duplicate check.
  const checks: DedupeCheck[] = [customer, tam, roe, dup, assoc, openOpp, dqOpp, partner];

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
    // Company name and email travel with the lead even when it has no account.
    company: lead.company ?? account?.name ?? null,
    email: lead.email ?? null,
    // Domain from the linked account, otherwise inferred from a work email
    // (null for personal/ISP addresses — see companyDomainFromEmail).
    domain: account?.domain ?? companyDomainFromEmail(lead.email),
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
          "This lead has no linked account, so the account-level checks (TAM, open opportunity, customer status) could not run.",
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
      "All checks clear — not an existing customer, in territory, no ROE conflict, no duplicate, no open opportunity, no DQ cooling-off, and no partner conflict.",
    recommendation: "Lead is workable. Proceed.",
  };
}
