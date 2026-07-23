import { NextResponse } from "next/server";
import type { Account } from "@/lib/salesforce/types";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { researchAccount } from "@/lib/research/research-account";
import { scoreLead } from "@/lib/leads/lead-scoring";
import { buildHygieneSuggestions } from "@/lib/workit/hygiene";
import { getCompanyIntelByDomain } from "@/lib/research/company-intel";
import { companyDomainFromEmail } from "@/lib/leads/email-domains";
import { SEQUENCES } from "@/lib/outreach";
import { formatCurrency } from "@/lib/workit/format";
import type { PanelSignals } from "@/components/workit/work-it-panel";

/**
 * Work-it layer for an SDR lead with no linked account. There's no account
 * record to research, so we synthesize one from the lead's company name and the
 * domain inferred from its work email, then run the same internet research
 * (website + Wikipedia) the account work-it uses. Returns the same shape as
 * /api/work-it/[accountId] so LeadFocusView can render AccountFitCard +
 * WorkItPanel identically.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { leadId } = await params;
  const provider = getSalesforceProvider();
  const lead = await provider.getSdrLead(leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const domain = companyDomainFromEmail(lead.email) ?? "";
  const companyName = lead.company ?? lead.name;
  // Industry hint (Salesforce Leads carry one). Drives the research path:
  // Nonprofit -> ProPublica 990; otherwise ZoomInfo/LinkedIn intel by domain.
  const industry = lead.industry ?? "Unknown";
  const isNonprofit = industry.toLowerCase().includes("nonprofit");

  // Synthetic account for the research pipeline — only name/domain/industry are
  // read. The nonprofit path runs ProPublica; for-profits fall back to
  // website + Wikipedia for history/contacts and ZoomInfo/LinkedIn for firmographics.
  const account: Account = {
    id: lead.id,
    name: companyName,
    domain,
    ownerId: "house",
    ownerName: "House Account",
    industry,
    type: "Prospect",
    product: lead.product,
    tam: null,
    abmNurtureStatus: null,
    lastActivityDate: null,
    intacct: { hasOpenOpps: false },
  };

  const [research, workItState] = await Promise.all([
    researchAccount(account, [], []),
    provider.getWorkItState(lead.id),
  ]);

  const score = scoreLead(lead, null);
  const hygiene = buildHygieneSuggestions(account, research);

  // For-profit firmographics come from ZoomInfo (revenue) + LinkedIn Sales
  // Navigator (employees); nonprofits use the 990 figures from research.
  const intel = isNonprofit ? null : getCompanyIntelByDomain(domain);

  const sourceLabel = intel
    ? "Web search · ZoomInfo · LinkedIn Sales Navigator"
    : research.dataSource === "propublica"
      ? "ProPublica (990)"
      : research.dataSource === "website"
        ? "Company website"
        : "Web research — limited public data";

  const revenueAmount = intel ? intel.revenue.amount : research.revenue.amount;
  const fteCount = intel ? intel.employees.count : research.employeeCount.count;

  const signals: PanelSignals = {
    revenue: formatCurrency(revenueAmount),
    fte: fteCount !== null ? `~${fteCount}` : "n/a",
    source: sourceLabel,
    intent: score.intent.signals[0].value,
    whyPrioritized: `score ${score.priority} (${score.tier}): fit ${score.fit.value}, intent ${score.intent.value}, workability ${score.workability.value}`,
  };

  const foundContacts = research.foundContacts.map((c) => ({
    name: c.name,
    title: c.title,
    source: c.source,
    isIcpMatch: c.isIcpMatch,
    inSalesforce: c.inSalesforce,
  }));

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
    existingRecords: [],
    workItState,
  });
}
