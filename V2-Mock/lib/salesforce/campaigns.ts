import type { AccountCampaign } from "@/lib/salesforce/types";

/** The campaign surfaced in the "Marketing Campaign Source" field. */
export interface MarketingCampaign {
  name: string;
  /** ISO date; null when the source (e.g. a web-form lead) carries no date. */
  date: string | null;
}

/**
 * The account's most recent campaign by date, or null when it has none. ISO
 * `YYYY-MM-DD` dates compare correctly as strings, so no Date parsing needed.
 */
export function mostRecentCampaign(
  campaigns: AccountCampaign[] | undefined | null,
): MarketingCampaign | null {
  if (!campaigns || campaigns.length === 0) return null;
  const latest = campaigns.reduce((a, b) => (b.date > a.date ? b : a));
  return { name: latest.name, date: latest.date };
}
