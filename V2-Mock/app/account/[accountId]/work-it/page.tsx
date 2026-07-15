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

function formatCurrency(amount: number | null): string {
  if (amount === null) return "Not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

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

      {research.errors.length > 0 && (
        <div className="mb-5 rounded-[14px] border border-warning-bg bg-warning-bg/30 px-5 py-3 text-[13px] text-warning">
          {research.errors.map((err) => (
            <p key={err}>{err}</p>
          ))}
        </div>
      )}

      <div className="mb-5 rounded-[14px] border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">Company Research</h2>
          <span className="text-[12.5px] text-muted-foreground">{sourceLabel}</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            <div className="rounded-[11px] border border-border bg-background px-4 py-3.5">
              <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                Revenue
              </label>
              <div className="text-base font-bold">{formatCurrency(revenueAmount)}</div>
              {intel ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Source: {intel.revenue.source}
                </p>
              ) : (
                research.revenue.taxYear && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Tax year {research.revenue.taxYear} · Source: {research.revenue.source}
                  </p>
                )
              )}
              {!intel && research.form990Url && (
                <a
                  href={research.form990Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[11px] text-link hover:underline"
                >
                  View Form 990 →
                </a>
              )}
            </div>
            <div className="rounded-[11px] border border-border bg-background px-4 py-3.5">
              <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                Full-Time Employees
              </label>
              <div className="text-base font-bold">{fteCount ?? "Not available"}</div>
              {intel ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Source: {intel.employees.source}
                </p>
              ) : (
                research.employeeCount.note && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {research.employeeCount.note}
                  </p>
                )
              )}
            </div>
            <div className="rounded-[11px] border border-border bg-background px-4 py-3.5">
              <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                Data Source
              </label>
              <div className="text-[13.5px] font-bold">{sourceLabel}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Industry: {account.industry}
                {intel ? " — non-nonprofit routing" : " — 990 routing"}
              </p>
            </div>
          </div>

          {intel && (
            <div className="mt-3.5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
              <div className="rounded-[11px] border border-border bg-background px-4 py-3">
                <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                  HQ Location
                </label>
                <div className="text-[13px] font-bold">{intel.hqLocation ?? "Not found"}</div>
              </div>
              <div className="rounded-[11px] border border-border bg-background px-4 py-3">
                <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                  Entities / Locations
                </label>
                <div className="text-[13px] font-bold">{intel.locations ?? "Not found"}</div>
              </div>
              <div className="rounded-[11px] border border-border bg-background px-4 py-3">
                <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                  Parent Account
                </label>
                <div className="text-[13px] font-bold">{intel.parentAccount ?? "None found"}</div>
              </div>
              <div className="rounded-[11px] border border-border bg-background px-4 py-3">
                <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                  Recent Funding
                </label>
                <div className="text-[13px] font-bold">
                  {intel.funding
                    ? `${intel.funding.round} — ${intel.funding.amount} (${intel.funding.date})`
                    : "None found"}
                </div>
                {intel.funding && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {intel.funding.investors}
                  </p>
                )}
              </div>
            </div>
          )}

          {research.revenueStream.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-[13px] font-bold">
                Revenue stream{" "}
                <span className="font-normal text-muted-foreground">
                  — tax year {research.revenue.taxYear}, per Form 990
                </span>
              </p>
              {research.revenueStream.map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between gap-3 border-b border-dashed border-border py-1 text-[12.5px] last:border-b-0"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">
                    {formatCurrency(item.amount)} ({item.pct}%)
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3.5 text-[13.5px]">
            <b>Company history:</b>{" "}
            {research.companyHistory ?? "No history could be extracted from public sources."}
          </p>
        </div>
      </div>

      {intel && (
        <div className="mb-5 rounded-[14px] border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <h2 className="text-[15.5px] font-semibold">Growth Signals</h2>
            <span className="text-[12.5px] text-muted-foreground">
              New hires, new locations, changes to the business
            </span>
          </div>
          <div className="p-5">
            {intel.growthSignals.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No recent growth signals found.
              </p>
            ) : (
              intel.growthSignals.map((signal) => (
                <div
                  key={signal}
                  className="flex items-center gap-2.5 border-b border-dashed border-border py-2 text-[13px] last:border-b-0"
                >
                  <div className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-primary-soft text-[13px]">
                    📈
                  </div>
                  <div>{signal}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {intel && (
        <div className="mb-5 rounded-[14px] border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <h2 className="text-[15.5px] font-semibold">Finance Hiring Signals</h2>
            <span className="text-[12.5px] text-muted-foreground">
              Open finance roles — job descriptions parsed for software &amp; skill clues
            </span>
          </div>
          <div className="p-5">
            {intel.hiringSignals.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No open finance roles found.
              </p>
            ) : (
              intel.hiringSignals.map((job) => (
                <div
                  key={job.role}
                  className="border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13.5px] font-bold">{job.role}</span>
                    <span className="text-[11.5px] text-muted-foreground">
                      Posted {job.postedDaysAgo} days ago · {job.source}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted-foreground italic">
                    &ldquo;{job.descriptionSnippet}&rdquo;
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {job.clues.map((clue) => (
                      <span
                        key={clue}
                        className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11.5px] font-bold text-primary"
                      >
                        {clue}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <WorkItPanel
        accountId={accountId}
        foundContacts={research.foundContacts.map((c) => ({
          name: c.name,
          title: c.title,
          source: c.source,
          isIcpMatch: c.isIcpMatch,
          inSalesforce: c.inSalesforce,
        }))}
        existingRecords={[
          ...contacts.map((c) => ({ name: c.name, title: c.title, kind: "Contact" as const })),
          ...leads.map((l) => ({ name: l.name, title: l.title, kind: "Lead" as const })),
        ]}
        hygiene={hygiene}
        sequences={SEQUENCES}
        signals={signals}
        initialAddedNames={workItState.addedContactNames}
        initialAppliedFields={workItState.appliedHygieneFields}
        initialPush={workItState.outreachPush}
      />

    </div>
  );
}
