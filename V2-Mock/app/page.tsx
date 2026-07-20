import { cookies } from "next/headers";
import { SearchForm } from "@/components/search/search-form";
import {
  WorklistExplorer,
  type AccountRow,
  type BlockedRow,
  type LeadRow,
} from "@/components/home/worklist-explorer";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { evaluateWorkability, blockedByLabel } from "@/lib/workability/engine";
import { scoreAccount } from "@/lib/scoring/scoring";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { getCurrentPriority, PRIORITY_COOKIE } from "@/lib/priority";
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
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);

  // Today's worked accounts (pushed / not-a-fit), derived from the audit log.
  const worked = await getWorkedToday(demoUser.id);
  const workedMap: Record<string, "pushed" | "not_fit"> = Object.fromEntries(
    Array.from(worked, ([id, entry]) => [id, entry.outcome]),
  );
  const justWorkedId = (await searchParams).worked ?? null;

  // Account worklist (all teams): workable ranked by score, plus the blocked list.
  const accounts = await provider.listAccounts();
  const accountRows: AccountRow[] = [];
  const blockedRows: BlockedRow[] = [];
  for (const { id } of accounts) {
    const bundle = await provider.getAccountBundle(id);
    if (!bundle) continue;
    const result = evaluateWorkability(bundle, team);
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

  // SDR lead worklist: filtered to the selected priority group, ranked by score.
  const allLeads = await provider.listSdrLeads();
  const leadRows: LeadRow[] = allLeads
    .filter((l) => l.priorityGroup === priority)
    .sort((a, b) => b.score - a.score)
    .map((l) => ({
      id: l.id,
      name: l.name,
      title: l.title,
      accountName: l.accountName,
      domain: l.domain,
      fit: l.fit,
      intent: l.intent,
      workability: l.workability,
      score: l.score,
    }));

  const mode = team === "SDR" ? "leads" : "accounts";

  return (
    <div>
      <div className="pt-2 pb-6 text-center">
        <h1 className="font-heading text-[26px] font-black">Can I work it? Should I work it?</h1>
        <p className="mt-1 text-muted-foreground">
          One verdict, with evidence, in under a minute — instead of 5 minutes across Salesforce,
          Fusion and VAR checks.
        </p>
        <div className="mx-auto mt-5 max-w-[560px]">
          <SearchForm />
        </div>
      </div>

      <WorklistExplorer
        mode={mode}
        demoUserName={demoUser.name}
        priorityLabel={team === "SDR" ? priority : undefined}
        accountRows={accountRows}
        leadRows={leadRows}
        blockedRows={blockedRows}
        workedMap={workedMap}
        justWorkedId={justWorkedId}
      />
    </div>
  );
}
