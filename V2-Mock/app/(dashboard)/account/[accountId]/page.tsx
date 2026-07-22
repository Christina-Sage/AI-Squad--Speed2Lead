import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  getSalesforceProvider,
  detectSearchType,
  buildSalesforceAccountUrl,
} from "@/lib/salesforce/provider";
import { evaluateWorkability } from "@/lib/workability/engine";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { AccountDetailView } from "@/components/results/account-detail-view";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { accountId } = await params;
  const { q } = await searchParams;

  const provider = getSalesforceProvider();
  const bundle = await provider.getAccountBundle(accountId);
  if (!bundle) {
    notFound();
  }

  const cookieStore = await cookies();
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  const duplicates = await provider.findDuplicateAccounts(accountId);
  const result = evaluateWorkability(bundle, team, duplicates);
  const searchInput = q ?? result.domain;

  await writeAuditLog({
    userId: demoUser.id,
    userName: demoUser.name,
    team,
    searchInput,
    searchType: detectSearchType(searchInput),
    accountId: result.account_id,
    domain: result.domain,
    accountName: result.account_name,
    finalStatus: result.final_status,
    reason: result.reason,
    reasonCodes: result.reason_codes,
    action: "SEARCH",
  });

  return (
    <div>
      <div className="mb-4 text-[12.5px] text-muted-foreground">
        <Link href="/" className="text-link hover:underline">
          ← Worklist
        </Link>{" "}
        / {result.account_name}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3.5">
        <h1 className="font-heading text-[21px] font-black">{result.account_name}</h1>
        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
          {result.account_id}
        </span>
      </div>

      <AccountDetailView
        result={result}
        demoUserName={demoUser.name}
        salesforceUrl={buildSalesforceAccountUrl(result.account_id)}
      />
    </div>
  );
}
