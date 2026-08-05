import { cookies } from "next/headers";
import { SearchForm } from "@/components/search/search-form";
import { AccountImport } from "@/components/home/account-import";
import {
  WorklistExplorer,
  type BlockedLeadRow,
  type LeadRow,
} from "@/components/home/worklist-explorer";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { buildAccountRows, buildLeadRows } from "@/lib/worklist/build";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { getCurrentProduct, PRODUCT_COOKIE } from "@/lib/products";
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
  const product = getCurrentProduct(cookieStore.get(PRODUCT_COOKIE)?.value);
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);

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
  const { rows: accountRows, blocked: blockedRows } = await buildAccountRows(
    provider,
    accounts.filter((acct) => acct.product === product),
    team,
  );

  // Membership of every account currently on the worklist (workable + blocked),
  // used as the default "save this list" set when nothing has been imported.
  const worklistAccountIds = [...accountRows.map((r) => r.id), ...blockedRows.map((r) => r.id)];

  // When a saved list is selected, narrow the worklist to its members.
  const inSelected = (id: string) => !selectedIds || selectedIds.has(id);
  const visibleAccountRows = accountRows.filter((r) => inSelected(r.id));
  const visibleBlockedRows = blockedRows.filter((r) => inSelected(r.id));

  // SDR lead worklist (SDR mode only): each visible lead gets its full
  // "Can I work this lead?" verdict. Filtered to the selected product.
  let leadRows: LeadRow[] = [];
  let blockedLeadRows: BlockedLeadRow[] = [];
  if (team === "SDR") {
    const allLeads = await provider.listSdrLeads();
    const built = await buildLeadRows(
      provider,
      allLeads.filter((l) => l.product === product),
      team,
      allLeads,
    );
    leadRows = built.rows;
    blockedLeadRows = built.blocked;
  }

  // Saved-list membership for SDR is keyed by workItId (accountId ?? leadId),
  // the same id worked-state is recorded under, so completion lines up.
  const leadMemberIds = [...leadRows.map((l) => l.workItId), ...blockedLeadRows.map((b) => b.id)];
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
