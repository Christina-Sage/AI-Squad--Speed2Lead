import { NextResponse } from "next/server";
import type { Account } from "@/lib/salesforce/types";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { researchAccount } from "@/lib/research/research-account";
import { scoreLead } from "@/lib/leads/lead-scoring";
import { buildHygieneSuggestions } from "@/lib/workit/hygiene";
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

  // Synthetic account for the research pipeline — only name/domain/industry are
  // read. Industry is unknown for a bare lead, so the nonprofit (ProPublica)
  // path is skipped and research comes from the website + Wikipedia.
  const account: Account = {
    id: lead.id,
    name: companyName,
    domain,
    ownerId: "house",
    ownerName: "House Account",
    industry: "Unknown",
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

  const sourceLabel =
    research.dataSource === "propublica"
      ? "ProPublica (990)"
      : research.dataSource === "website"
        ? "Company website"
        : "Web research — limited public data";

  const revenueAmount = research.revenue.amount;
  const fteCount = research.employeeCount.count;

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
    intel: null,
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
