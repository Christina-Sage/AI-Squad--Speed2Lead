import { cookies } from "next/headers";
import { SearchForm } from "@/components/search/search-form";
import { AccountImport } from "@/components/home/account-import";
import {
  WorklistExplorer,
  type AccountRow,
  type BlockedLeadRow,
  type BlockedRow,
  type LeadRow,
} from "@/components/home/worklist-explorer";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { computeDuplicateLeads } from "@/lib/leads/lead-dedupe";
import { evaluateLeadWorkability } from "@/lib/leads/lead-workability";
import { evaluateWorkability, blockedByLabel } from "@/lib/workability/engine";
import { evaluatePartner } from "@/lib/workability/partner";

// Short "why blocked" label for a NOT-WORKABLE lead, keyed by its failing check.
const LEAD_BLOCK_LABEL: Record<string, string> = {
  dup: "Duplicate",
  assoc: "Account blocked",
  roe: "ROE / owned by rep",
  openOpp: "Open opportunity",
  customer: "Existing customer",
};
import { scoreAccount } from "@/lib/scoring/scoring";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { getCurrentPriority, PRIORITY_COOKIE } from "@/lib/priority";
import { getCurrentProduct, PRODUCT_COOKIE } from "@/lib/products";
import { getCurrentVertical, matchesVertical, VERTICAL_COOKIE } from "@/lib/verticals";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getWorkedToday, getWorkedAccountIds } from "@/lib/audit/worked";
import {
  listSavedWorklists,
  getSelectedWorklistId,
  SAVED_WORKLIST_COOKIE,
} from "@/lib/worklists/saved";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ worked?: string }>;
}) {
  const provider = getSalesforceProvider();
  const cookieStore = await cookies();
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);
  const priority = getCurrentPriority(cookieStore.get(PRIORITY_COOKIE)?.value);
  const product = getCurrentProduct(cookieStore.get(PRODUCT_COOKIE)?.value);
  const vertical = getCurrentVertical(cookieStore.get(VERTICAL_COOKIE)?.value);
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  // The Vertical selector is shown for Intacct only (see the dashboard layout),
  // so the vertical filter applies there too. "All Vertical" is the no-filter
  // state. When active, the whole worklist (accounts + leads) is narrowed to the
  // selected vertical, mapped from each record's industry.
  const applyVertical = product === "Intacct" && vertical !== "all";

  // Today's worked accounts (pushed / not-a-fit / archived), from the audit log.
  const worked = await getWorkedToday(demoUser.id);
  const workedMap: Record<string, "pushed" | "not_fit" | "archived"> = Object.fromEntries(
    Array.from(worked, ([id, entry]) => [id, entry.outcome]),
  );
  const justWorkedId = (await searchParams).worked ?? null;

  // Saved Worklists (per-user). Completion is lifetime, so it uses every account
  // the user has ever worked, not just today's. Loading is defensive: if the
  // saved_worklists table hasn't been migrated yet, the worklist still renders
  // (just without saved lists) rather than 500-ing the whole page.
  let savedLists: Awaited<ReturnType<typeof listSavedWorklists>> = [];
  try {
    const workedEver = await getWorkedAccountIds(demoUser.id);
    savedLists = await listSavedWorklists(demoUser.id, workedEver);
  } catch (err) {
    console.error("[worklist] saved worklists unavailable:", err);
  }
  const selectedListId = getSelectedWorklistId(cookieStore.get(SAVED_WORKLIST_COOKIE)?.value);
  const selectedList = selectedListId
    ? savedLists.find((l) => l.id === selectedListId) ?? null
    : null;
  const selectedIds = selectedList ? new Set(selectedList.accountIds) : null;

  // Account worklist (all teams): workable ranked by score, plus the blocked
  // list. Filtered to the selected product so the dashboard shows one product
  // line at a time.
  const accounts = await provider.listAccounts();
  const accountRows: AccountRow[] = [];
  const blockedRows: BlockedRow[] = [];
  for (const acct of accounts) {
    if (acct.product !== product) continue;
    if (applyVertical && !matchesVertical(vertical, acct.industry)) continue;
    const bundle = await provider.getAccountBundle(acct.id);
    if (!bundle) continue;
    const duplicates = await provider.findDuplicateAccounts(acct.id);
    const result = evaluateWorkability(bundle, team, duplicates);
    const score = scoreAccount(bundle, result);
    if (score === null) {
      blockedRows.push({
        id: result.account_id,
        name: result.account_name,
        domain: result.domain,
        industry: result.industry,
        type: result.type,
        blockedBy: blockedByLabel(result),
      });
    } else {
      accountRows.push({
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
  // Worklist order (feedback): Workable ranked by score, then In Review
  // (WORKABLE WITH REVIEW — includes any partner relationship) ranked by score.
  const reviewRank = (r: AccountRow) => (r.finalStatus === "WORKABLE WITH REVIEW" ? 1 : 0);
  accountRows.sort((a, b) => reviewRank(a) - reviewRank(b) || b.priority - a.priority);

  // Membership of every account currently on the worklist (workable + blocked),
  // used as the default "save this list" set when nothing has been imported.
  const worklistAccountIds = [
    ...accountRows.map((r) => r.id),
    ...blockedRows.map((r) => r.id),
  ];

  // When a saved list is selected, narrow the worklist to its members.
  const inSelected = (id: string) => !selectedIds || selectedIds.has(id);
  const visibleAccountRows = accountRows.filter((r) => inSelected(r.id));
  const visibleBlockedRows = blockedRows.filter((r) => inSelected(r.id));

  // SDR lead worklist (SDR mode only): each visible lead gets its full
  // "Can I work this lead?" verdict. NOT WORKABLE leads drop into the blocked
  // list; the rest are ranked by score and tagged Workable / Review.
  const leadRows: LeadRow[] = [];
  const blockedLeadRows: BlockedLeadRow[] = [];
  if (team === "SDR") {
    const allLeads = await provider.listSdrLeads();
    const duplicateLeads = computeDuplicateLeads(allLeads);
    const visibleLeads = allLeads.filter((l) => l.product === product && l.priorityGroup === priority);
    for (const item of visibleLeads) {
      const bundle = await provider.getSdrLeadBundle(item.id);
      if (!bundle) continue;
      // A lead's vertical follows its linked account's industry (when linked),
      // otherwise the lead's own industry hint. Same Intacct-only vertical filter
      // as the account worklist.
      if (applyVertical) {
        const leadIndustry = bundle.accountBundle?.account.industry ?? bundle.lead.industry ?? null;
        if (!matchesVertical(vertical, leadIndustry)) continue;
      }
      const dupInfo = duplicateLeads.get(item.id) ?? null;
      const result = evaluateLeadWorkability(bundle.lead, bundle.accountBundle, team, dupInfo);
      if (result.final_status === "NOT WORKABLE") {
        const failKey = result.checks.find((c) => c.state === "fail")?.key ?? "";
        blockedLeadRows.push({
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
        leadRows.push({
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
          // Worked-state / saved-list member id: account id when linked, else the lead id.
          workItId: item.accountId ?? item.id,
        });
      }
    }
    // Order (same as accounts): Workable ranked by score, then In Review by score.
    const leadReviewRank = (l: LeadRow) => (l.finalStatus === "WORKABLE WITH REVIEW" ? 1 : 0);
    leadRows.sort((a, b) => leadReviewRank(a) - leadReviewRank(b) || b.score - a.score);
  }

  // Saved-list membership for SDR is keyed by workItId (accountId ?? leadId),
  // the same id worked-state is recorded under, so completion lines up.
  const leadMemberIds = [
    ...leadRows.map((l) => l.workItId),
    ...blockedLeadRows.map((b) => b.id),
  ];
  const visibleLeadRows = leadRows.filter((l) => !selectedIds || selectedIds.has(l.workItId));
  const visibleBlockedLeadRows = blockedLeadRows.filter(
    (b) => !selectedIds || selectedIds.has(b.id),
  );

  const mode = team === "SDR" ? "leads" : "accounts";
  const worklistMemberIds = mode === "leads" ? leadMemberIds : worklistAccountIds;

  return (
    <div>
      <div className="pt-2 pb-6 text-center">
        <h1 className="font-heading text-[26px] font-black">WorkIt</h1>
        <p className="mt-1 text-muted-foreground">
          WorkIt is an AI agent that answers two questions for an SDR or BDR in under a minute: &ldquo;Can
          I work it?&rdquo; and &ldquo;Should I work it?&rdquo; Reps can then push qualified accounts and leads
          into Outreach, and back into Salesforce for continued data hygiene.
        </p>
        <div className="mx-auto mt-5 flex max-w-[640px] items-start gap-2">
          <div className="flex-1">
            <SearchForm team={team} />
          </div>
          <AccountImport team={team} />
        </div>
      </div>

      <WorklistExplorer
        mode={mode}
        team={team}
        product={product}
        demoUserName={demoUser.name}
        priorityLabel={team === "SDR" ? priority : undefined}
        accountRows={visibleAccountRows}
        leadRows={visibleLeadRows}
        blockedRows={mode === "accounts" ? visibleBlockedRows : []}
        blockedLeadRows={mode === "leads" ? visibleBlockedLeadRows : []}
        workedMap={workedMap}
        justWorkedId={justWorkedId}
        savedLists={savedLists}
        selectedListId={selectedListId}
        worklistAccountIds={worklistMemberIds}
      />
    </div>
  );
}
