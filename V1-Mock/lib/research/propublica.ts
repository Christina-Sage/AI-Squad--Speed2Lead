import * as cheerio from "cheerio";
import type { FoundContact } from "@/lib/research/types";

const USER_AGENT = "Mozilla/5.0 (compatible; DedupeEngineResearchBot/1.0)";
const SEARCH_URL = "https://projects.propublica.org/nonprofits/api/v2/search.json";

function organizationUrl(ein: number): string {
  return `https://projects.propublica.org/nonprofits/api/v2/organizations/${ein}.json`;
}

function organizationPageUrl(ein: number): string {
  return `https://projects.propublica.org/nonprofits/organizations/${ein}`;
}

export interface ProPublicaSearchResult {
  ein: number;
  name: string;
  city: string | null;
  state: string | null;
  score: number;
}

interface SearchApiOrganization {
  ein: number;
  name: string;
  city?: string | null;
  state?: string | null;
  score?: number;
}

interface SearchApiResponse {
  organizations?: SearchApiOrganization[];
}

export async function searchNonprofit(name: string): Promise<ProPublicaSearchResult[]> {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return [];

  const data = (await res.json()) as SearchApiResponse;
  return (data.organizations ?? []).map((o) => ({
    ein: o.ein,
    name: o.name,
    city: o.city ?? null,
    state: o.state ?? null,
    score: o.score ?? 0,
  }));
}

export interface ProPublicaFiling {
  totalRevenue: number | null;
  taxYear: number | null;
  pdfUrl: string | null;
  contributionsAndGrants: number | null;
  programServiceRevenue: number | null;
  investmentIncome: number | null;
}

interface FilingApiRecord {
  tax_prd_yr?: number;
  totrevenue?: number;
  pdf_url?: string;
  totcntrbgfts?: number;
  totprgmrevnue?: number;
  invstmntinc?: number;
}

interface OrganizationApiResponse {
  filings_with_data?: FilingApiRecord[];
}

async function fetchFilings(ein: number): Promise<FilingApiRecord[]> {
  const res = await fetch(organizationUrl(ein), { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return [];
  const data = (await res.json()) as OrganizationApiResponse;
  return data.filings_with_data ?? [];
}

// Fallback only — ProPublica's structured JSON API lags behind what's already
// visible on the org's own page (see getCurrentFiling), sometimes by years.
export async function getLatestFiling(ein: number): Promise<ProPublicaFiling | null> {
  const filings = await fetchFilings(ein);
  if (filings.length === 0) return null;

  const latest = [...filings].sort((a, b) => (b.tax_prd_yr ?? 0) - (a.tax_prd_yr ?? 0))[0];

  return {
    totalRevenue: latest.totrevenue ?? null,
    taxYear: latest.tax_prd_yr ?? null,
    pdfUrl: latest.pdf_url ?? null,
    contributionsAndGrants: latest.totcntrbgfts ?? null,
    programServiceRevenue: latest.totprgmrevnue ?? null,
    investmentIncome: latest.invstmntinc ?? null,
  };
}

// The PDF (if one exists yet) is only indexed in the JSON API, keyed by year.
export async function getPdfUrlForYear(ein: number, taxYear: number): Promise<string | null> {
  const filings = await fetchFilings(ein);
  const match = filings.find((f) => f.tax_prd_yr === taxYear);
  return match?.pdf_url ?? null;
}

// The org's own ProPublica page lists every e-filed return, newest first, and
// is generated straight from the IRS XML — it's current the moment a filing
// is e-filed. The structured JSON API (filings_with_data) is a separate,
// slower-to-update pipeline and can lag by years. So: find the most recent
// filing link on the org page, then read its rendered full-text view, where
// the IRS schema field names are preserved as element ids (e.g.
// `.../TotalEmployeeCnt[1]`, `.../CYTotalRevenueAmt[1]`). That rendered view
// isn't behind the PDF download endpoint's bot-block.
function findMostRecentFilingId(html: string, ein: number): string | null {
  const filingLinkRe = new RegExp(`/nonprofits/organizations/${ein}/(\\d+)/full`);
  const match = html.match(filingLinkRe);
  return match ? match[1] : null;
}

function extractIrsField(text: string, fieldName: string): string | null {
  const match = text.match(new RegExp(`${fieldName}\\[1\\]">([^<]*)<`));
  return match?.[1] ?? null;
}

function parseIrsNumber(raw: string | null): number | null {
  if (!raw) return null;
  const n = parseInt(raw.replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function toTitleCase(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export interface ParsedOfficer {
  name: string;
  title: string;
}

// Officers/directors/key employees, read straight from Form 990 Part VII
// Section A. The org page's own summary table truncates around the top ~25
// highest-compensated people — this reads every entry in the schema instead
// (e.g. `Form990PartVIISectionAGrp[26]/PersonNm[1]`), so people further down
// the list (a Controller below the comp cutoff, for example) aren't missed.
function extractOfficers(text: string): ParsedOfficer[] {
  const nameRe = /Form990PartVIISectionAGrp\[(\d+)\]\/PersonNm\[1\]">([^<]*)</g;
  const titleRe = /Form990PartVIISectionAGrp\[(\d+)\]\/TitleTxt\[1\]">([^<]*)</g;

  const names = new Map<string, string>();
  const titles = new Map<string, string>();
  let m: RegExpExecArray | null;
  while ((m = nameRe.exec(text))) names.set(m[1], m[2]);
  while ((m = titleRe.exec(text))) titles.set(m[1], m[2]);

  const officers: ParsedOfficer[] = [];
  for (const [idx, rawName] of names) {
    const rawTitle = titles.get(idx);
    if (!rawTitle?.trim()) continue;
    officers.push({
      name: toTitleCase(decodeHtmlEntities(rawName)),
      title: toTitleCase(decodeHtmlEntities(rawTitle)),
    });
  }
  return officers;
}

export interface CurrentFiling {
  taxYear: number | null;
  totalRevenue: number | null;
  employeeCount: number | null;
  contributionsAndGrants: number | null;
  programServiceRevenue: number | null;
  investmentIncome: number | null;
  officers: ParsedOfficer[];
}

async function fetchCurrentFilingFields(filingId: string): Promise<CurrentFiling | null> {
  for (const formType of ["IRS990", "IRS990PF", "IRS990EZ"]) {
    const url = `https://projects.propublica.org/nonprofits/full_text/${filingId}/${formType}`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, redirect: "follow" });
      if (!res.ok) continue;
      const text = await res.text();

      const totalRevenue = parseIrsNumber(extractIrsField(text, "CYTotalRevenueAmt"));
      const employeeCount = parseIrsNumber(
        extractIrsField(text, "TotalEmployeeCnt") ?? extractIrsField(text, "EmployeeCnt"),
      );
      if (totalRevenue === null && employeeCount === null) continue; // wrong form variant for this filing

      const endDate = extractIrsField(text, "TaxPeriodEndDt");
      const taxYear = endDate ? parseInt(endDate.slice(-4), 10) : null;

      return {
        taxYear,
        totalRevenue,
        employeeCount,
        contributionsAndGrants: parseIrsNumber(extractIrsField(text, "CYContributionsGrantsAmt")),
        programServiceRevenue: parseIrsNumber(extractIrsField(text, "CYProgramServiceRevenueAmt")),
        investmentIncome: parseIrsNumber(extractIrsField(text, "CYInvestmentIncomeAmt")),
        officers: extractOfficers(text),
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function getCurrentFiling(ein: number): Promise<CurrentFiling | null> {
  const pageRes = await fetch(organizationPageUrl(ein), { headers: { "User-Agent": USER_AGENT } });
  if (!pageRes.ok) return null;

  const html = await pageRes.text();
  const filingId = findMostRecentFilingId(html, ein);
  if (!filingId) return null;

  return fetchCurrentFilingFields(filingId);
}

export async function getOfficers(ein: number): Promise<FoundContact[]> {
  const res = await fetch(organizationPageUrl(ein), { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const mostRecentTable = $("table.employees").first();

  const contacts: FoundContact[] = [];
  mostRecentTable.find("tr.employee-row").each((_, el) => {
    const cell = $(el).find("td").first();
    const titleRaw = cell.find("span").text().trim();
    const name = cell.clone().children("span").remove().end().text().trim();
    const title = titleRaw.replace(/^\(/, "").replace(/\)$/, "").trim();

    if (!name || !title) return;
    contacts.push({ name, title, source: "990", isIcpMatch: false, inSalesforce: false, matchedRecord: null });
  });

  return contacts;
}
