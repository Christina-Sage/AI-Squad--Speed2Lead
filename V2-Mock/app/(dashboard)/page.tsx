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
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getWorkedToday } from "@/lib/audit/worked";

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
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);

  // Today's worked accounts (pushed / not-a-fit), derived from the audit log.
  const worked = await getWorkedToday(demoUser.id);
  const workedMap: Record<string, "pushed" | "not_fit"> = Object.fromEntries(
    Array.from(worked, ([id, entry]) => [id, entry.outcome]),
  );
  const justWorkedId = (await searchParams).worked ?? null;

  // Account worklist (all teams): workable ranked by score, plus the blocked
  // list. Filtered to the selected product so the dashboard shows one product
  // line at a time.
  const accounts = await provider.listAccounts();
  const accountRows: AccountRow[] = [];
  const blockedRows: BlockedRow[] = [];
  for (const acct of accounts) {
    if (acct.product !== product) continue;
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
      });
    }
  }
  accountRows.sort((a, b) => b.priority - a.priority);

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
          isNew: item.isNew,
        });
      }
    }
    leadRows.sort((a, b) => b.score - a.score);
  }

  const mode = team === "SDR" ? "leads" : "accounts";

  return (
    <div>
      <div className="pt-2 pb-6 text-center">
        <h1 className="font-heading text-[26px] font-black">Can I work it? Should I work it?</h1>
        <p className="mt-1 text-muted-foreground">
          One verdict, with evidence, in under a minute — instead of 5 minutes across Salesforce,
          Fusion and VAR checks.
        </p>
        <div className="mx-auto mt-5 flex max-w-[640px] items-start gap-2">
          <div className="flex-1">
            <SearchForm />
          </div>
          <AccountImport />
        </div>
      </div>

      <WorklistExplorer
        mode={mode}
        demoUserName={demoUser.name}
        priorityLabel={team === "SDR" ? priority : undefined}
        accountRows={accountRows}
        leadRows={leadRows}
        blockedRows={mode === "accounts" ? blockedRows : []}
        blockedLeadRows={mode === "leads" ? blockedLeadRows : []}
        workedMap={workedMap}
        justWorkedId={justWorkedId}
      />
    </div>
  );
}
