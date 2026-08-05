// Shared worklist row builders. Both the home page (the preloaded demo
// worklist) and the CSV-import route run the SAME de-dupe verdict + scoring
// pipeline through these functions, so an imported list is scored and ranked
// identically to the demo — one source of truth, no drift.
import type { SalesforceProvider } from "@/lib/salesforce/provider";
import type { AccountListItem } from "@/lib/salesforce/types";
import type { SdrLeadListItem } from "@/lib/leads/types";
import type { Team } from "@/lib/teams";
import type {
  AccountRow,
  BlockedRow,
  LeadRow,
  BlockedLeadRow,
} from "@/components/home/worklist-explorer";
import { evaluateWorkability, blockedByLabel } from "@/lib/workability/engine";
import { evaluatePartner } from "@/lib/workability/partner";
import { scoreAccount } from "@/lib/scoring/scoring";
import { computeDuplicateLeads } from "@/lib/leads/lead-dedupe";
import { evaluateLeadWorkability } from "@/lib/leads/lead-workability";

// Short "why blocked" label for a NOT-WORKABLE lead, keyed by its failing check.
const LEAD_BLOCK_LABEL: Record<string, string> = {
  dup: "Duplicate",
  assoc: "Account blocked",
  roe: "ROE / owned by rep",
  openOpp: "Open opportunity",
  customer: "Existing customer",
};

/**
 * Build the account worklist rows for the given accounts: the workable ones
 * (ranked — Workable first, then In Review, each by score) and the blocked
 * ones. The caller decides which accounts to pass (the demo passes one product
 * line; the import passes the resolved upload across any product).
 */
export async function buildAccountRows(
  provider: SalesforceProvider,
  accounts: AccountListItem[],
  team: Team,
): Promise<{ rows: AccountRow[]; blocked: BlockedRow[] }> {
  const rows: AccountRow[] = [];
  const blocked: BlockedRow[] = [];
  for (const acct of accounts) {
    const bundle = await provider.getAccountBundle(acct.id);
    if (!bundle) continue;
    const duplicates = await provider.findDuplicateAccounts(acct.id);
    const result = evaluateWorkability(bundle, team, duplicates);
    const score = scoreAccount(bundle, result);
    if (score === null) {
      blocked.push({
        id: result.account_id,
        name: result.account_name,
        domain: result.domain,
        industry: result.industry,
        type: result.type,
        blockedBy: blockedByLabel(result),
      });
    } else {
      rows.push({
        id: result.account_id,
        name: result.account_name,
        domain: result.domain,
        industry: result.industry,
        type: result.type,
        finalStatus: result.final_status,
        fit: score.fit.value,
        intent: score.intent.value,
        workability: score.workability.value,
        priority: score.priority,
        hasPartner: result.partner_detail.hasRelationship,
        partnerSource: result.partner_detail.source,
        partnerName: result.partner_detail.partnerName,
        partnerRegistered: result.partner_detail.registered,
      });
    }
  }
  const reviewRank = (r: AccountRow) => (r.finalStatus === "WORKABLE WITH REVIEW" ? 1 : 0);
  rows.sort((a, b) => reviewRank(a) - reviewRank(b) || b.priority - a.priority);
  return { rows, blocked };
}

/**
 * Build the SDR lead worklist rows. `allLeads` is the full lead set used for
 * cross-lead duplicate detection; `leads` is the subset to actually build rows
 * for (the demo's product line, or the resolved upload).
 */
export async function buildLeadRows(
  provider: SalesforceProvider,
  leads: SdrLeadListItem[],
  team: Team,
  allLeads: SdrLeadListItem[],
): Promise<{ rows: LeadRow[]; blocked: BlockedLeadRow[] }> {
  const duplicateLeads = computeDuplicateLeads(allLeads);
  const rows: LeadRow[] = [];
  const blocked: BlockedLeadRow[] = [];
  for (const item of leads) {
    const bundle = await provider.getSdrLeadBundle(item.id);
    if (!bundle) continue;
    const dupInfo = duplicateLeads.get(item.id) ?? null;
    const result = evaluateLeadWorkability(bundle.lead, bundle.accountBundle, team, dupInfo);
    if (result.final_status === "NOT WORKABLE") {
      const failKey = result.checks.find((c) => c.state === "fail")?.key ?? "";
      blocked.push({
        id: item.id,
        name: item.name,
        subtitle: item.accountName ?? item.title,
        reason: dupInfo
          ? `Duplicate ${dupInfo.matchedOn} — matches “${dupInfo.duplicateOf}”`
          : LEAD_BLOCK_LABEL[failKey] ?? "Not workable",
        badge: dupInfo ? "Duplicate" : "Don’t work",
      });
    } else {
      // Partner (VAR) motion for a lead: the linked account's partner
      // relationship (Intacct/Fusion), or a lead that came in through a VAR.
      const partner = bundle.accountBundle ? evaluatePartner(bundle.accountBundle.account) : null;
      const varLead = /\bVAR\b|reseller|value[- ]?added/i.test(bundle.lead.source ?? "");
      const hasPartner = (partner?.hasRelationship ?? false) || varLead;
      rows.push({
        id: item.id,
        name: item.name,
        title: item.title,
        accountId: item.accountId,
        accountName: item.accountName,
        domain: item.domain,
        fit: item.fit,
        intent: item.intent,
        workability: item.workability,
        score: item.score,
        finalStatus:
          result.final_status === "WORKABLE WITH REVIEW" ? "WORKABLE WITH REVIEW" : "WORKABLE",
        hasPartner,
        partnerSource: partner?.hasRelationship ? partner.source : varLead ? "VAR" : null,
        partnerName: partner?.hasRelationship
          ? partner.partnerName
          : varLead
            ? bundle.lead.source ?? "VAR lead"
            : null,
        partnerRegistered: partner?.registered ?? false,
        // Worked-state / saved-list member id: account id when linked, else lead id.
        workItId: item.accountId ?? item.id,
      });
    }
  }
  const leadReviewRank = (l: LeadRow) => (l.finalStatus === "WORKABLE WITH REVIEW" ? 1 : 0);
  rows.sort((a, b) => leadReviewRank(a) - leadReviewRank(b) || b.score - a.score);
  return { rows, blocked };
}
