/**
 * ZoomInfo Enterprise API client — company enrichment + contact discovery.
 *
 * Activates only when `isZoomInfoConfigured()` is true (all three env vars
 * set). Auth is a two-step JWT exchange: username + client ID + PKI private
 * key → short-lived JWT (~1h), sent as a Bearer token. Enrichment is billed
 * per lookup, so responses are meant to be cached (see BACKEND §10.5).
 *
 * Endpoints and field names follow the public spec at
 * https://docs.zoominfo.com/docs/overview and are UNTESTED against the live
 * API. Verify before enabling in production.
 */
import { zoomInfoConfig, isZoomInfoConfigured } from "@/lib/integrations/config";
import type { CompanyIntel } from "@/lib/research/company-intel";

const AUTH_URL = "https://api.zoominfo.com/authenticate";
const BASE_URL = "https://api.zoominfo.com";

let cachedToken: { jwt: string; expiresAt: number } | null = null;

/**
 * Exchange PKI credentials for a JWT. The signed-key flow expects the private
 * key to sign the request; here we post the credentials to the authenticate
 * endpoint and cache the returned token until shortly before expiry.
 */
async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > nowMs() + 60_000) {
    return cachedToken.jwt;
  }
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: zoomInfoConfig.username,
      clientId: zoomInfoConfig.clientId,
      privateKey: zoomInfoConfig.privateKey,
    }),
  });
  if (!res.ok) {
    throw new Error(`ZoomInfo auth failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { jwt: string };
  // JWTs are valid ~60 minutes; cache for 55 to be safe.
  cachedToken = { jwt: data.jwt, expiresAt: nowMs() + 55 * 60_000 };
  return data.jwt;
}

// Date.now() is fine at runtime; wrapped so tests can see the seam.
function nowMs(): number {
  return Date.now();
}

interface ZoomInfoCompany {
  revenue?: number;
  employeeCount?: number;
  city?: string;
  state?: string;
  locationCount?: number;
  parentName?: string;
  recentFundingRound?: string;
  recentFundingAmount?: string;
  recentFundingDate?: string;
  recentInvestors?: string;
}

/**
 * Enrich a company by domain and map ZoomInfo's response onto the app's
 * existing `CompanyIntel` shape. Returns null when ZoomInfo isn't configured
 * or has no match, so callers can fall back to the fixture path.
 */
export async function enrichCompanyByDomain(domain: string): Promise<CompanyIntel | null> {
  if (!isZoomInfoConfigured()) return null;

  const token = await getToken();
  const res = await fetch(`${BASE_URL}/enrich/company`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      matchCompanyInput: [{ companyDomain: domain }],
      outputFields: [
        "revenue",
        "employeeCount",
        "city",
        "state",
        "locationCount",
        "parentName",
        "recentFundingRound",
        "recentFundingAmount",
        "recentFundingDate",
        "recentInvestors",
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`ZoomInfo enrich failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    data?: { result?: { data?: ZoomInfoCompany[] }[] };
  };
  const company = data.data?.result?.[0]?.data?.[0];
  if (!company) return null;

  return mapToCompanyIntel(company);
}

function mapToCompanyIntel(c: ZoomInfoCompany): CompanyIntel {
  const hqLocation = [c.city, c.state].filter(Boolean).join(", ") || null;
  return {
    revenue: { amount: c.revenue ?? null, source: "ZoomInfo" },
    // ZoomInfo also returns headcount; the app keeps FTE on the Sales Nav
    // seam, so employees stays null here unless you choose to re-point it.
    employees: { count: null, source: "LinkedIn Sales Navigator" },
    hqLocation,
    locations: c.locationCount ? `${c.locationCount} locations` : null,
    parentAccount: c.parentName ?? null,
    funding:
      c.recentFundingRound && c.recentFundingAmount
        ? {
            round: c.recentFundingRound,
            amount: c.recentFundingAmount,
            date: c.recentFundingDate ?? "",
            investors: c.recentInvestors ?? "",
          }
        : null,
    growthSignals: [],
    hiringSignals: [],
  };
}

export interface ZoomInfoContact {
  name: string;
  title: string;
  email: string | null;
}

/**
 * Search contacts at a company by domain + job titles (the ICP path). Feeds
 * `researchAccount()` as a second contact source alongside 990 officers and
 * the website scrape. Returns [] when unconfigured.
 */
export async function searchContactsByDomain(
  domain: string,
  titles: string[],
): Promise<ZoomInfoContact[]> {
  if (!isZoomInfoConfigured()) return [];

  const token = await getToken();
  const res = await fetch(`${BASE_URL}/search/contact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ companyDomain: domain, jobTitle: titles.join(" OR ") }),
  });
  if (!res.ok) {
    throw new Error(`ZoomInfo contact search failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    data?: { firstName?: string; lastName?: string; jobTitle?: string; email?: string }[];
  };
  return (data.data ?? []).map((c) => ({
    name: [c.firstName, c.lastName].filter(Boolean).join(" "),
    title: c.jobTitle ?? "",
    email: c.email ?? null,
  }));
}
