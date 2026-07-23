import type { AccountBundle, Contact, Lead } from "@/lib/salesforce/types";
import type { Team } from "@/lib/teams";
import { evaluateRoe, type RoeResult } from "@/lib/workability/roe";
import { evaluateOpenOpportunities, type OpenOppResult } from "@/lib/workability/open-opportunity";
import { evaluateDqOpportunities, type DqOppResult } from "@/lib/workability/dq-opportunity";
import { evaluatePartner, type PartnerResult } from "@/lib/workability/partner";
import {
  evaluateCustomerTam,
  CUSTOMER_TAM_BLANK,
  CUSTOMER_EXPIRED_TAM,
  TAM_EXPIRED,
  type CustomerTamResult,
} from "@/lib/workability/customer-tam";
import { duplicateReason, type DuplicateMatch } from "@/lib/workability/duplicate";
import { mostRecentCampaign, type MarketingCampaign } from "@/lib/salesforce/campaigns";

export type FinalStatus = "WORKABLE" | "WORKABLE WITH REVIEW" | "NOT WORKABLE";

export type RoeScope = "Contacts" | "Leads" | "Leads + Contacts";

// "na" is used by the lead-level checklist when an account-dependent check
// cannot run (no linked account). The account engine never emits "na".
export type CheckState = "pass" | "warn" | "fail" | "na";

export interface DedupeCheck {
  /** Account keys plus lead-level keys (dup, assoc, suppression). */
  key: string;
  label: string;
  question: string;
  /** "pf" renders Pass/Fail badges, "yn" renders No/Yes (yes = blocking). */
  badgeType: "pf" | "yn";
  state: CheckState;
  reason: string;
  /**
   * Optional structured detail rendered as small label/value chips under the
   * reason — keeps evidence-heavy checks (e.g. Account Association) scannable
   * instead of packing everything into one sentence. Omit for simple checks.
   */
  facts?: { label: string; value: string }[];
}

export interface WorkabilityResult {
  account_id: string;
  account_name: string;
  domain: string;
  industry: string;
  type: string;
  owner: string;
  tam_status: string;
  abm_nurture_status: string | null;
  /** Most recent marketing campaign that touched the account; null when none. */
  marketing_campaign: MarketingCampaign | null;
  team: Team;
  roe_scope: RoeScope;
  roe_status: "PASS" | "FAIL";
  open_opportunity_status: "PASS" | "FAIL";
  dq_opportunity_status: "PASS" | "FAIL";
  partner_status: "PASS" | "FAIL";
  customer_status: CustomerTamResult["customerStatus"];
  tam_validation_status: CustomerTamResult["tamStatus"];
  final_status: FinalStatus;
  reason: string;
  recommendation: string;
  reason_codes: string[];
  roe_detail: RoeResult;
  open_opportunity_detail: OpenOppResult;
  dq_opportunity_detail: DqOppResult;
  partner_detail: PartnerResult;
  /** The six-check breakdown driving the "Can I work it?" checklist. */
  checks: DedupeCheck[];
}

export const DQ_OPP_COOLING_OFF = "DQ_OPP_COOLING_OFF";
export const PARTNER_REGISTERED = "PARTNER_REGISTERED";
export const DUPLICATE_ACCOUNT = "DUPLICATE_ACCOUNT";

function recordsForTeam(
  _team: Team,
  leads: Lead[],
  contacts: Contact[],
): { leads: Lead[]; contacts: Contact[]; scope: RoeScope } {
  // ROE protection is account-level, not team-level: BDR primarily works Contacts and
  // SDR primarily works Leads, but each must still confirm the *other* object type has
  // no activity in the last 30 days before working the account. So every team checks both.
  return { leads, contacts, scope: "Leads + Contacts" };
}

function tamLabel(tam: AccountBundle["account"]["tam"]): string {
  return tam ?? "Blank";
}

function buildReasonAndRecommendation(
  finalStatus: FinalStatus,
  roe: RoeResult,
  openOpp: OpenOppResult,
  customerTam: CustomerTamResult,
  dqOpp: DqOppResult,
  partner: PartnerResult,
  duplicates: DuplicateMatch[],
): { reason: string; recommendation: string } {
  if (finalStatus === "NOT WORKABLE") {
    if (roe.status === "FAIL") {
      const r = roe.violatingRecords[0];
      return {
        reason: `A ${r.recordType.toLowerCase()} owned by ${r.owner} was contacted ${r.daysSinceActivity} days ago, which falls within the 30-day ROE protection window. This account cannot currently be worked.`,
        recommendation: "Do not work this account. Wait until the ROE window has passed.",
      };
    }
    if (openOpp.status === "FAIL") {
      const o = openOpp.openOpportunities[0];
      return {
        reason: `An open opportunity ("${o.name}", stage ${o.stage}) owned by ${o.owner} already exists for this account.`,
        recommendation: "Do not work this account. Coordinate with the existing opportunity owner.",
      };
    }
    if (customerTam.reasonCodes.includes(CUSTOMER_TAM_BLANK)) {
      return {
        reason: `Account Type is Customer and TAM is Blank, indicating a potential direct customer relationship.`,
        recommendation: "Do not work this account until customer status is validated.",
      };
    }
    if (dqOpp.status === "FAIL") {
      const d = dqOpp.blockingOpportunities[0];
      return {
        reason: `A disqualified opportunity ("${d.name}") reached ${d.furthestStage} before closing, so the account is in the six-month cooling-off window (${d.monthsRemaining} month${d.monthsRemaining === 1 ? "" : "s"} left).`,
        recommendation: "Do not work this account until the cooling-off window has passed.",
      };
    }
    if (partner.status === "FAIL") {
      return {
        reason: `${partner.varStatus} — a partner holds an active deal registration on this account.`,
        recommendation: "Do not work this account. Route through the partner/channel team.",
      };
    }
  }

  if (finalStatus === "WORKABLE WITH REVIEW") {
    if (customerTam.reasonCodes.includes(CUSTOMER_EXPIRED_TAM)) {
      return {
        reason: `Account Type is Customer and TAM is Expired Intacct TAM. Verify customer status before working.`,
        recommendation: "Review before assigning account",
      };
    }
    if (customerTam.reasonCodes.includes(TAM_EXPIRED)) {
      return {
        reason: `TAM is Expired Intacct TAM for this account. Verify TAM status before working.`,
        recommendation: "Review before assigning account",
      };
    }
    if (duplicates.length > 0) {
      return {
        reason: duplicateReason(duplicates),
        recommendation: "Review the potential duplicate account before assigning.",
      };
    }
  }

  return {
    reason:
      "All six checks clear — no ROE violation, no open opportunity, no disqualified-opp cooling-off, and no customer/TAM/partner concerns.",
    recommendation: "Account is workable. Proceed.",
  };
}

function buildChecks(
  bundle: AccountBundle,
  roe: RoeResult,
  openOpp: OpenOppResult,
  customerTam: CustomerTamResult,
  dqOpp: DqOppResult,
  partner: PartnerResult,
  duplicates: DuplicateMatch[],
): DedupeCheck[] {
  const { account } = bundle;

  const customerState: CheckState =
    customerTam.customerStatus === "BLOCKED"
      ? "fail"
      : customerTam.customerStatus === "WARNING"
        ? "warn"
        : "pass";
  const customerReason =
    customerState === "pass"
      ? `Type: ${account.type} — not an existing customer`
      : customerState === "warn"
        ? `Type: Customer with Expired Intacct TAM — verify customer status before working`
        : `Type: Customer with TAM blank — potential direct customer relationship. Route to Customer Success.`;

  const tamState: CheckState = customerTam.tamStatus === "WARNING" && customerState === "pass" ? "warn" : "pass";
  const tamReason =
    account.tam === null
      ? "TAM: Blank — falls within team territory"
      : account.tam === "Expired Intacct TAM"
        ? "TAM: Expired Intacct TAM — verify before working"
        : `TAM: ${account.tam}`;

  const roeReason =
    roe.status === "PASS"
      ? "Leads + Contacts checked — no owner conflict with another rep"
      : (() => {
          const r = roe.violatingRecords[0];
          return `${r.recordType} "${r.name}" owned by ${r.owner} — activity logged ${r.daysSinceActivity} days ago (within 30-day ROE window)`;
        })();

  const openOppReason =
    openOpp.status === "PASS"
      ? "No open opportunity on this account"
      : (() => {
          const o = openOpp.openOpportunities[0];
          return `Open opp: "${o.name}" (${o.stage}, owner ${o.owner})`;
        })();

  return [
    {
      key: "customer",
      label: "Customer Status",
      question: "Is this a prospect (not an existing customer)?",
      badgeType: "pf",
      state: customerState,
      reason: customerReason,
    },
    {
      key: "tam",
      label: "TAM",
      question: "Does the account fall within your territory?",
      badgeType: "pf",
      state: tamState,
      reason: tamReason,
    },
    {
      key: "roe",
      label: "ROE",
      question: "Any lead/contact conflict with another rep?",
      badgeType: "pf",
      state: roe.status === "PASS" ? "pass" : "fail",
      reason: roeReason,
    },
    {
      key: "duplicate",
      label: "Duplicate Account",
      question: "Any duplicate account records?",
      badgeType: "yn",
      state: duplicates.length > 0 ? "warn" : "pass",
      reason: duplicateReason(duplicates),
    },
    {
      key: "openOpp",
      label: "Open Opportunity",
      question: "Does an open opp already exist?",
      badgeType: "pf",
      state: openOpp.status === "PASS" ? "pass" : "fail",
      reason: openOppReason,
    },
    {
      key: "dqOpp",
      label: "Disqualified Opportunity",
      question: "Blocking DQ opp?",
      badgeType: "yn",
      state: dqOpp.status === "PASS" ? "pass" : "fail",
      reason: dqOpp.reason,
    },
    {
      key: "partner",
      label: "Partner Relationship",
      question: "Partner conflict found?",
      badgeType: "yn",
      state: partner.status === "PASS" ? "pass" : "fail",
      reason: partner.reason,
    },
  ];
}

export function evaluateWorkability(
  bundle: AccountBundle,
  team: Team = "BDR",
  duplicates: DuplicateMatch[] = [],
): WorkabilityResult {
  const { account, leads, contacts, opportunities } = bundle;

  const scoped = recordsForTeam(team, leads, contacts);
  const roe = evaluateRoe(scoped.leads, scoped.contacts);
  const openOpp = evaluateOpenOpportunities(opportunities, account.intacct);
  const customerTam = evaluateCustomerTam(account.type, account.tam);
  const dqOpp = evaluateDqOpportunities(opportunities);
  const partner = evaluatePartner(account.intacct);

  const hardFail =
    roe.status === "FAIL" ||
    openOpp.status === "FAIL" ||
    dqOpp.status === "FAIL" ||
    partner.status === "FAIL" ||
    customerTam.reasonCodes.includes(CUSTOMER_TAM_BLANK);

  const needsReview =
    !hardFail &&
    (customerTam.reasonCodes.includes(TAM_EXPIRED) ||
      customerTam.reasonCodes.includes(CUSTOMER_EXPIRED_TAM) ||
      duplicates.length > 0);

  const final_status: FinalStatus = hardFail
    ? "NOT WORKABLE"
    : needsReview
      ? "WORKABLE WITH REVIEW"
      : "WORKABLE";

  const { reason, recommendation } = buildReasonAndRecommendation(
    final_status,
    roe,
    openOpp,
    customerTam,
    dqOpp,
    partner,
    duplicates,
  );

  const reason_codes: string[] = [
    ...(roe.status === "FAIL" ? ["ROE_VIOLATION"] : []),
    ...(openOpp.status === "FAIL" ? ["OPEN_OPPORTUNITY"] : []),
    ...(dqOpp.status === "FAIL" ? [DQ_OPP_COOLING_OFF] : []),
    ...(partner.status === "FAIL" ? [PARTNER_REGISTERED] : []),
    ...(duplicates.length > 0 ? [DUPLICATE_ACCOUNT] : []),
    ...customerTam.reasonCodes,
  ];

  return {
    account_id: account.id,
    account_name: account.name,
    domain: account.domain,
    industry: account.industry,
    type: account.type,
    owner: account.ownerName,
    tam_status: tamLabel(account.tam),
    abm_nurture_status: account.abmNurtureStatus,
    marketing_campaign: mostRecentCampaign(account.campaigns),
    team,
    roe_scope: scoped.scope,
    roe_status: roe.status,
    open_opportunity_status: openOpp.status,
    dq_opportunity_status: dqOpp.status,
    partner_status: partner.status,
    customer_status: customerTam.customerStatus,
    tam_validation_status: customerTam.tamStatus,
    final_status,
    reason,
    recommendation,
    reason_codes,
    roe_detail: roe,
    open_opportunity_detail: openOpp,
    dq_opportunity_detail: dqOpp,
    partner_detail: partner,
    checks: buildChecks(bundle, roe, openOpp, customerTam, dqOpp, partner, duplicates),
  };
}

/** Short label for worklist "blocked by" chips, derived from the failing checks. */
export function blockedByLabel(result: WorkabilityResult): string {
  const fails = result.checks.filter((c) => c.state === "fail");
  if (fails.length === 0) return "Review required";
  return fails
    .map((c) => {
      switch (c.key) {
        case "customer":
          return "Existing customer";
        case "tam":
          return "Outside territory";
        case "roe":
          return "ROE conflict";
        case "openOpp":
          return "Open opportunity";
        case "dqOpp":
          return "DQ opp cooling-off";
        case "partner":
          return "Partner deal registration";
        default:
          return c.label;
      }
    })
    .join(" + ");
}
