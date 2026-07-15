import type { Account, Contact, Lead } from "@/lib/salesforce/types";
import type { CompanyResearchResult, FoundContact, RevenueStreamItem } from "@/lib/research/types";
import { matchesIcp } from "@/lib/research/icp";
import {
  getCurrentFiling,
  getLatestFiling,
  getOfficers,
  getPdfUrlForYear,
  searchNonprofit,
} from "@/lib/research/propublica";
import { researchWebsite } from "@/lib/research/website";
import { getWikipediaSummary } from "@/lib/research/wikipedia";

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ");
}

interface RevenueFields {
  totalRevenue: number | null;
  contributionsAndGrants: number | null;
  programServiceRevenue: number | null;
  investmentIncome: number | null;
}

function buildRevenueStream(filing: RevenueFields): RevenueStreamItem[] {
  const total = filing.totalRevenue;
  if (!total) return [];

  const known: [string, number | null][] = [
    ["Contributions & Grants", filing.contributionsAndGrants],
    ["Program Service Revenue", filing.programServiceRevenue],
    ["Investment Income", filing.investmentIncome],
  ];

  const items: RevenueStreamItem[] = known
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0)
    .map(([label, amount]) => ({ label, amount, pct: Math.round((amount / total) * 1000) / 10 }));

  const accountedFor = items.reduce((sum, item) => sum + item.amount, 0);
  const other = total - accountedFor;
  if (other > 0) {
    items.push({ label: "Other Revenue", amount: other, pct: Math.round((other / total) * 1000) / 10 });
  }

  return items;
}

function crossReferenceSalesforce(
  contacts: FoundContact[],
  leads: Lead[],
  salesforceContacts: Contact[],
): FoundContact[] {
  const contactsByName = new Map(salesforceContacts.map((c) => [normalizeName(c.name), c]));
  const leadsByName = new Map(leads.map((l) => [normalizeName(l.name), l]));

  return contacts.map((contact) => {
    const key = normalizeName(contact.name);
    const matchedContact = contactsByName.get(key);
    const matchedLead = leadsByName.get(key);
    const matchedRecord = matchedContact
      ? { type: "Contact" as const, name: matchedContact.name }
      : matchedLead
        ? { type: "Lead" as const, name: matchedLead.name }
        : null;

    return {
      ...contact,
      isIcpMatch: matchesIcp(contact.title),
      inSalesforce: matchedRecord !== null,
      matchedRecord,
    };
  });
}

export async function researchAccount(
  account: Account,
  leads: Lead[],
  contacts: Contact[],
): Promise<CompanyResearchResult> {
  const errors: string[] = [];
  let dataSource: CompanyResearchResult["dataSource"] = "none";
  let organizationName: string | null = null;
  let ein: string | null = null;
  let form990Url: string | null = null;
  let revenue: CompanyResearchResult["revenue"] = { amount: null, taxYear: null, source: null };
  let revenueStream: RevenueStreamItem[] = [];
  let rawContacts: FoundContact[] = [];
  let employeeCount: CompanyResearchResult["employeeCount"] = { count: null, source: null };

  if (account.industry.toLowerCase().includes("nonprofit")) {
    try {
      const candidates = await searchNonprofit(account.name);
      const best = candidates.sort((a, b) => b.score - a.score)[0];

      if (best) {
        organizationName = best.name;
        ein = String(best.ein);

        // getCurrentFiling reads the org's own page (current the moment a
        // return is e-filed) instead of the structured JSON API, which can
        // lag the actual most recent filing by years. It also reads the full
        // Part VII officer list, not just the org page's truncated top-~25
        // summary table, so people further down the list aren't missed.
        const current = await getCurrentFiling(best.ein);

        if (current && current.totalRevenue !== null) {
          dataSource = "propublica";
          revenue = { amount: current.totalRevenue, taxYear: current.taxYear, source: "990" };
          revenueStream = buildRevenueStream(current);
          employeeCount =
            current.employeeCount !== null
              ? { count: current.employeeCount, source: "990" }
              : {
                  count: null,
                  source: "990",
                  note: "Total employees could not be found in the e-filed return.",
                };
          form990Url = current.taxYear ? await getPdfUrlForYear(best.ein, current.taxYear) : null;
          rawContacts =
            current.officers.length > 0
              ? current.officers.map((o) => ({
                  name: o.name,
                  title: o.title,
                  source: "990" as const,
                  isIcpMatch: false,
                  inSalesforce: false,
                  matchedRecord: null,
                }))
              : await getOfficers(best.ein);
        } else {
          // Fall back to the (possibly stale) JSON API if the page scrape failed outright.
          const [filing, officers] = await Promise.all([getLatestFiling(best.ein), getOfficers(best.ein)]);
          rawContacts = officers;
          if (filing) {
            dataSource = "propublica";
            form990Url = filing.pdfUrl;
            revenue = { amount: filing.totalRevenue, taxYear: filing.taxYear, source: "990" };
            revenueStream = buildRevenueStream(filing);
          }
        }
      } else {
        errors.push(`No ProPublica nonprofit record found for "${account.name}".`);
      }
    } catch {
      errors.push("ProPublica lookup failed.");
    }
  }

  let companyHistory: string | null = null;

  try {
    const site = await researchWebsite(account.domain);
    if (site.error) {
      errors.push(site.error);
    } else {
      companyHistory = site.companyHistory;
      if (employeeCount.count === null && site.employeeCount !== null) {
        employeeCount = { count: site.employeeCount, source: "website" };
      }
      rawContacts = [...rawContacts, ...site.foundContacts];
      if (dataSource === "none" && (site.foundContacts.length > 0 || companyHistory)) {
        dataSource = "website";
      }
    }
  } catch {
    errors.push(`Could not research website for ${account.domain}.`);
  }

  try {
    const wikiSummary = await getWikipediaSummary(account.name);
    if (wikiSummary) companyHistory = wikiSummary;
  } catch {
    // Wikipedia is a best-effort supplement; ignore failures.
  }

  const dedupedContacts = Array.from(
    new Map(rawContacts.map((c) => [`${normalizeName(c.name)}|${c.title}`, c])).values(),
  );

  const resolvedContacts = crossReferenceSalesforce(dedupedContacts, leads, contacts).filter(
    (c) => c.isIcpMatch,
  );
  const flaggedContacts = resolvedContacts.filter((c) => !c.inSalesforce);

  return {
    dataSource,
    organizationName,
    ein,
    form990Url,
    companyHistory,
    revenue,
    employeeCount,
    revenueStream,
    foundContacts: resolvedContacts,
    flaggedContacts,
    errors,
  };
}
