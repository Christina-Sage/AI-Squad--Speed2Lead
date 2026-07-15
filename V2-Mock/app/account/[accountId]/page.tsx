import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  getSalesforceProvider,
  detectSearchType,
  buildSalesforceAccountUrl,
} from "@/lib/salesforce/provider";
import { evaluateWorkability } from "@/lib/workability/engine";
import { scoreAccount } from "@/lib/scoring/scoring";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { DedupeChecklist } from "@/components/results/dedupe-checklist";
import { ScoringCard } from "@/components/results/scoring-card";
import { OwnerEditor } from "@/components/results/owner-editor";
import { AbmStatusEditor } from "@/components/results/abm-status-editor";

function SummaryField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
        {label}
      </label>
      <div className="text-[13.5px] font-bold">{children}</div>
    </div>
  );
}

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

  const result = evaluateWorkability(bundle, team);
  const score = scoreAccount(bundle, result);
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

      <DedupeChecklist
        accountId={result.account_id}
        checks={result.checks}
        finalStatus={result.final_status}
        reason={result.reason}
        recommendation={result.recommendation}
        ownerName={result.owner}
        isCurrentOwner={result.owner === demoUser.name}
        salesforceUrl={buildSalesforceAccountUrl(result.account_id)}
      />

      <div className="mb-6 rounded-[14px] border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">Account Summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 p-5 md:grid-cols-4">
          <SummaryField label="Account Name">
            <a
              href={buildSalesforceAccountUrl(result.account_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:underline"
            >
              {result.account_name}
            </a>
          </SummaryField>
          <SummaryField label="Domain">
            <a
              href={`https://${result.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:underline"
            >
              {result.domain}
            </a>
          </SummaryField>
          <SummaryField label="Industry">{result.industry}</SummaryField>
          <SummaryField label="Type">{result.type}</SummaryField>
          <SummaryField label="TAM">{result.tam_status}</SummaryField>
          <SummaryField label="Owner">
            <OwnerEditor accountId={result.account_id} currentOwnerName={result.owner} />
          </SummaryField>
          <SummaryField label="ABM Account Status">
            <AbmStatusEditor
              accountId={result.account_id}
              currentStatus={result.abm_nurture_status}
            />
          </SummaryField>
          <SummaryField label="Team">{result.team}</SummaryField>
        </div>
      </div>

      {score && <ScoringCard accountId={result.account_id} score={score} />}
    </div>
  );
}
