/**
 * LinkedIn Sales Navigator (Application Platform) client — employee count and
 * headcount-growth trend, the "FTE" fixture's real source.
 *
 * Activates only when `isSalesNavigatorConfigured()` is true. LinkedIn's
 * partner APIs require program approval; auth is OAuth 2.0 (a partner-issued
 * access token). Per BACKEND §10.3 this is best synced nightly into Postgres
 * rather than called per page view.
 *
 * Endpoints follow the public Sales Navigator API surface
 * (https://learn.microsoft.com/en-us/linkedin/sales) and are UNTESTED against
 * the live API. Verify before enabling in production.
 */
import { salesNavigatorConfig, isSalesNavigatorConfigured } from "@/lib/integrations/config";

const BASE_URL = "https://api.linkedin.com/v2";

export interface HeadcountResult {
  /** Current full-time employee count. */
  count: number | null;
  /** e.g. "+14% over the last 12 months", or null when unavailable. */
  growthTrend: string | null;
}

/**
 * Look up headcount for a company by domain. Returns nulls when unconfigured
 * or unmatched so callers fall back to the fixture.
 */
export async function getHeadcountByDomain(domain: string): Promise<HeadcountResult> {
  if (!isSalesNavigatorConfigured()) {
    return { count: null, growthTrend: null };
  }

  const res = await fetch(
    `${BASE_URL}/organizations?q=emailDomain&emailDomain=${encodeURIComponent(domain)}`,
    { headers: { Authorization: `Bearer ${salesNavigatorConfig.accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(`Sales Navigator lookup failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    elements?: { staffCount?: number; staffCountGrowthYoY?: number }[];
  };
  const org = data.elements?.[0];
  if (!org) return { count: null, growthTrend: null };

  const growthTrend =
    typeof org.staffCountGrowthYoY === "number"
      ? `${org.staffCountGrowthYoY > 0 ? "+" : ""}${Math.round(org.staffCountGrowthYoY * 100)}% over the last 12 months`
      : null;

  return { count: org.staffCount ?? null, growthTrend };
}
