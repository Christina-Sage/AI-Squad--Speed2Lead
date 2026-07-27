/**
 * 6sense client — Account Buying Stage, ABM segmentation, and web-intent
 * signals (the Intent pillar's real source).
 *
 * The only integration that really is "just an API key" — auth is a single
 * bearer token. Activates when `isSixSenseConfigured()` is true.
 *
 * NOTE: Account Buying Stage is normally written by 6sense straight into
 * Salesforce, so once the Global SF provider is live the stage arrives "for
 * free" on the account record. This client is for the richer intent signals
 * (pricing-page visits, demo requests, keyword surges) that aren't synced to
 * SF. Endpoints follow the public spec at https://developers.6sense.com and
 * are UNTESTED against the live API. Verify before enabling in production.
 */
import { sixSenseConfig, isSixSenseConfigured } from "@/lib/integrations/config";

const BASE_URL = "https://api.6sense.com/v3";

export type BuyingStage =
  | "Target"
  | "Awareness"
  | "Consideration"
  | "Purchase"
  | "Decision";

export interface IntentResult {
  buyingStage: BuyingStage | null;
  /** Intent signal strings, e.g. "Visited pricing page 3x this week". */
  signals: string[];
  /** 6sense buying-stage confidence 0–100, when provided. */
  score: number | null;
}

/** Fetch intent for a company by domain. Returns empty result when unconfigured. */
export async function getIntentByDomain(domain: string): Promise<IntentResult> {
  if (!isSixSenseConfigured()) {
    return { buyingStage: null, signals: [], score: null };
  }

  const res = await fetch(
    `${BASE_URL}/company/details?domain=${encodeURIComponent(domain)}`,
    { headers: { Authorization: `Token ${sixSenseConfig.apiToken}` } },
  );
  if (!res.ok) {
    throw new Error(`6sense lookup failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    buying_stage?: string;
    intent_score?: number;
    intent_signals?: { keyword?: string; activity?: string }[];
  };

  const signals = (data.intent_signals ?? [])
    .map((s) => s.activity ?? s.keyword)
    .filter((s): s is string => Boolean(s));

  return {
    buyingStage: (data.buying_stage as BuyingStage | undefined) ?? null,
    signals,
    score: typeof data.intent_score === "number" ? data.intent_score : null,
  };
}
