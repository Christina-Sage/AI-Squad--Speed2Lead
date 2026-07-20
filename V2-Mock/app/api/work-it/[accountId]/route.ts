import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { researchAccount } from "@/lib/research/research-account";
import { evaluateWorkability } from "@/lib/workability/engine";
import { scoreAccount } from "@/lib/scoring/scoring";
import { buildHygieneSuggestions } from "@/lib/workit/hygiene";
import { getCompanyIntel } from "@/lib/research/company-intel";
import { SEQUENCES } from "@/lib/outreach";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { formatCurrency } from "@/lib/workit/format";
import type { PanelSignals } from "@/components/workit/work-it-panel";

/**
 * Work-it layer for the in-page reveal. Mirrors the server computation in
 * /account/[id]/work-it so the hash-driven focus view can load the same
 * research / hygiene / contacts / signals client-side (the focus hash never
 * reaches the server, so the page component can't compute this).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await params;
  const provider = getSalesforceProvider();
  const bundle = await provider.getAccountBundle(accountId);
  if (!bundle) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
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

  return NextResponse.json({
    account: {
      name: account.name,
      domain: account.domain,
      industry: account.industry,
      dataSource: research.dataSource,
      organizationName: research.organizationName,
      ein: research.ein,
    },
    research,
    intel,
    sourceLabel,
    revenueAmount,
    fteCount,
    hygiene,
    sequences: SEQUENCES,
    signals,
    foundContacts,
    existingRecords,
    workItState,
  });
}
