import { NextResponse } from "next/server";
import type { Account } from "@/lib/salesforce/types";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { researchAccount } from "@/lib/research/research-account";
import { scoreLead } from "@/lib/leads/lead-scoring";
import { buildHygieneSuggestions } from "@/lib/workit/hygiene";
import { getCompanyIntelByDomain } from "@/lib/research/company-intel";
import { buildNoteSourceSignals } from "@/lib/workit/account-note";
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
  // Bundle so we can surface the linked account's existing contacts (SDR
  // managers want to see who else is on the account beside the incoming lead).
  const bundle = await provider.getSdrLeadBundle(leadId);
  if (!bundle) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  const { lead, accountBundle } = bundle;

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

  // Research against the linked account's real leads/contacts (when present) so
  // research finds are correctly flagged already-in-Salesforce.
  const accountContacts = accountBundle?.contacts ?? [];
  const accountLeads = accountBundle?.leads ?? [];
  const [research, workItState] = await Promise.all([
    researchAccount(account, accountLeads, accountContacts),
    provider.getWorkItState(lead.id),
  ]);

  // Existing Contacts (SDR): the linked account's contacts + other leads,
  // excluding the incoming lead itself. Empty when the lead has no linked
  // account — the card then stays hidden on the SDR side.
  const existingRecords = accountBundle
    ? [
        ...accountContacts.map((c) => ({ name: c.name, title: c.title, kind: "Contact" as const })),
        ...accountLeads
          .filter((l) => l.id !== lead.id)
          .map((l) => ({ name: l.name, title: l.title, kind: "Lead" as const })),
      ]
    : [];

  // Pass the linked account bundle so the DQ history + cool-off (and intent
  // detail) render on the SDR fit card exactly like BDR. Null for standalone leads.
  const score = scoreLead(lead, accountBundle);
  const hygiene = buildHygieneSuggestions(account, research);

  // For-profit firmographics come from ZoomInfo (revenue) + LinkedIn Sales
  // Navigator (employees); nonprofits use the 990 figures from research.
  const intel = isNonprofit ? null : getCompanyIntelByDomain(domain, industry);

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
    ...buildNoteSourceSignals({ intentDetail: score.intent.detail, intel }),
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
    existingRecords,
    // Drives the read-only Existing Contacts card on the SDR side: show it
    // whenever the lead has a linked account, even if that account has no
    // contacts on file yet.
    leadHasAccount: accountBundle !== null,
    workItState,
  });
}
