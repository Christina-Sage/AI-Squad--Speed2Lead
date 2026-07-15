import type { AccountBundle, Contact, Lead } from "@/lib/salesforce/types";
import type { Team } from "@/lib/teams";
import { evaluateRoe, type RoeResult } from "@/lib/workability/roe";
import { evaluateOpenOpportunities, type OpenOppResult } from "@/lib/workability/open-opportunity";
import {
  evaluateCustomerTam,
  CUSTOMER_TAM_BLANK,
  CUSTOMER_EXPIRED_TAM,
  TAM_EXPIRED,
  type CustomerTamResult,
} from "@/lib/workability/customer-tam";

export type FinalStatus = "WORKABLE" | "WORKABLE WITH REVIEW" | "NOT WORKABLE";

export type RoeScope = "Contacts" | "Leads" | "Leads + Contacts";

export interface WorkabilityResult {
  account_id: string;
  account_name: string;
  domain: string;
  industry: string;
  type: string;
  owner: string;
  tam_status: string;
  abm_nurture_status: string | null;
  team: Team;
  roe_scope: RoeScope;
  roe_status: "PASS" | "FAIL";
  open_opportunity_status: "PASS" | "FAIL";
  customer_status: CustomerTamResult["customerStatus"];
  tam_validation_status: CustomerTamResult["tamStatus"];
  final_status: FinalStatus;
  reason: string;
  recommendation: string;
  reason_codes: string[];
  roe_detail: RoeResult;
  open_opportunity_detail: OpenOppResult;
}

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
  }

  return {
    reason: "No ROE violation, no open opportunity, and no customer/TAM concerns were found.",
    recommendation: "Account is workable. Proceed.",
  };
}

export function evaluateWorkability(bundle: AccountBundle, team: Team = "BDR"): WorkabilityResult {
  const { account, leads, contacts, opportunities } = bundle;

  const scoped = recordsForTeam(team, leads, contacts);
  const roe = evaluateRoe(scoped.leads, scoped.contacts);
  const openOpp = evaluateOpenOpportunities(opportunities, account.intacct);
  const customerTam = evaluateCustomerTam(account.type, account.tam);

  const hardFail =
    roe.status === "FAIL" ||
    openOpp.status === "FAIL" ||
    customerTam.reasonCodes.includes(CUSTOMER_TAM_BLANK);

  const needsReview =
    !hardFail &&
    (customerTam.reasonCodes.includes(TAM_EXPIRED) ||
      customerTam.reasonCodes.includes(CUSTOMER_EXPIRED_TAM));

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
  );

  const reason_codes: string[] = [
    ...(roe.status === "FAIL" ? ["ROE_VIOLATION"] : []),
    ...(openOpp.status === "FAIL" ? ["OPEN_OPPORTUNITY"] : []),
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
    team,
    roe_scope: scoped.scope,
    roe_status: roe.status,
    open_opportunity_status: openOpp.status,
    customer_status: customerTam.customerStatus,
    tam_validation_status: customerTam.tamStatus,
    final_status,
    reason,
    recommendation,
    reason_codes,
    roe_detail: roe,
    open_opportunity_detail: openOpp,
  };
}
