import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { researchAccount } from "@/lib/research/research-account";
import { evaluateWorkability } from "@/lib/workability/engine";
import { scoreAccount } from "@/lib/scoring/scoring";
import { buildHygieneSuggestions } from "@/lib/workit/hygiene";
import { getCompanyIntel } from "@/lib/research/company-intel";
import { SEQUENCES } from "@/lib/outreach";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { WorkItPanel, type PanelSignals } from "@/components/workit/work-it-panel";
import { AccountFitCard } from "@/components/workit/account-fit-card";
import { formatCurrency } from "@/lib/workit/format";

export default async function WorkItPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;

  const provider = getSalesforceProvider();
  const bundle = await provider.getAccountBundle(accountId);
  if (!bundle) {
    notFound();
  }

  const { account, leads, contacts } = bundle;
  const cookieStore = await cookies();
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  const [research, workItState] = await Promise.all([
    researchAccount(account, leads, contacts),
    provider.getWorkItState(accountId),
  ]);

  const result = evaluateWorkability(bundle, team);
  const score = scoreAccount(bundle, result);
  const hygiene = buildHygieneSuggestions(account, research);

  // Industry routing: Nonprofit → ProPublica (990) + web. Everything else →
  // web search with ZoomInfo (revenue) and LinkedIn Sales Navigator (FTE).
  const intel = getCompanyIntel(account);

  const sourceLabel = intel
    ? "Web search · ZoomInfo · LinkedIn Sales Navigator"
    : research.dataSource === "propublica"
      ? "ProPublica (990)"
      : research.dataSource === "website"
        ? "Company website"
        : "None found";

  const revenueAmount = intel ? intel.revenue.amount : research.revenue.amount;
  const fteCount = intel ? intel.employees.count : research.employeeCount.count;

  const signals: PanelSignals = {
    revenue: formatCurrency(revenueAmount),
    fte: fteCount !== null ? `~${fteCount}` : "n/a",
    source: intel ? "ZoomInfo" : sourceLabel,
    intent: score ? score.intent.signals[0].value : "no recent web intent detected",
    whyPrioritized: score
      ? `score ${score.priority} (${score.tier}): fit ${score.fit.value}, intent ${score.intent.value}, workability ${score.workability.value}`
      : "passed all six de-dupe checks",
  };

  const foundContacts = research.foundContacts.map((c) => ({
    name: c.name,
    title: c.title,
    source: c.source,
    isIcpMatch: c.isIcpMatch,
    inSalesforce: c.inSalesforce,
  }));
  const existingRecords = [
    ...contacts.map((c) => ({ name: c.name, title: c.title, kind: "Contact" as const })),
    ...leads.map((l) => ({ name: l.name, title: l.title, kind: "Lead" as const })),
  ];

  return (
    <div>
      <div className="mb-4 text-[12.5px] text-muted-foreground">
        <Link href="/" className="text-link hover:underline">
          ← Worklist
        </Link>{" "}
        /{" "}
        <Link
          href={`/account/${accountId}?q=${encodeURIComponent(account.domain)}`}
          className="text-link hover:underline"
        >
          {account.name}
        </Link>{" "}
        / Work it
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-3.5">
        <h1 className="font-heading text-[21px] font-black">Work it — {account.name}</h1>
        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
          {account.domain}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground italic">
        Best-effort extraction from public sources — verify before acting on it.
        {research.dataSource === "propublica" &&
          ` Matched to "${research.organizationName}" (EIN ${research.ein}) on ProPublica Nonprofit Explorer.`}
      </p>

      {score && (
        <AccountFitCard
          accountId={accountId}
          score={score}
          accountName={account.name}
          domain={account.domain}
          industry={account.industry}
          sourceLabel={sourceLabel}
          revenueAmount={revenueAmount}
          fteCount={fteCount}
          intel={intel}
          research={research}
          foundContacts={foundContacts}
          existingRecords={existingRecords}
          initialAddedNames={workItState.addedContactNames}
        />
      )}

      <WorkItPanel
        accountId={accountId}
        foundContacts={foundContacts}
        existingRecords={existingRecords}
        hygiene={hygiene}
        sequences={SEQUENCES}
        signals={signals}
        initialAppliedFields={workItState.appliedHygieneFields}
        initialPush={workItState.outreachPush}
      />

    </div>
  );
}
