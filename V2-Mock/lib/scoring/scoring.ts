import type { AccountBundle } from "@/lib/salesforce/types";
import type { WorkabilityResult } from "@/lib/workability/engine";
import { getCompanyIntel } from "@/lib/research/company-intel";
import { computeSegment } from "@/lib/scoring/segment";

export interface ScoreSignal {
  label: string;
  value: string;
  good: boolean;
}

export interface ScorePillar {
  value: number;
  signals: ScoreSignal[];
}

export interface AccountScore {
  fit: ScorePillar;
  intent: ScorePillar;
  workability: ScorePillar;
  priority: number;
  tier: "P1" | "P2" | "P3";
}

export const SCORE_WEIGHTS = { fit: 0.4, intent: 0.35, workability: 0.25 } as const;

/**
 * Fit and intent signals come from external systems (6sense, Outreach, web
 * intent) that the mock provider does not model, so they are fixture-driven
 * per account. Workability is computed live from Salesforce data below.
 */
const FIT_INTENT_FIXTURES: Record<string, { fit: ScorePillar; intent: ScorePillar }> = {
  "0015Y00000GLBX01": {
    fit: {
      value: 86,
      signals: [
        { label: "ICP match", value: "Nonprofit · 200–500 FTE", good: true },
        { label: "Product fit", value: "Intacct core financials", good: true },
        { label: "Vertical", value: "Nonprofit (priority vertical)", good: true },
        { label: "Segment", value: "Mid-market", good: true },
      ],
    },
    intent: {
      value: 74,
      signals: [
        { label: "Web intent", value: "Pricing page ×3 this week", good: true },
        { label: "Outreach activity", value: "Opened 2 emails, no reply", good: false },
        { label: "ABM Vertical Segmentation", value: "Tier 1 — Decision stage", good: true },
        { label: "Recycled MQL", value: "Webinar signup 21 days ago", good: true },
      ],
    },
  },
  "0015Y00000ACME01": {
    fit: {
      value: 78,
      signals: [
        { label: "ICP match", value: "Manufacturing · 500–1k FTE", good: true },
        { label: "Product fit", value: "Intacct + inventory add-on", good: true },
        { label: "Vertical", value: "Manufacturing", good: true },
        { label: "Segment", value: "Upper mid-market", good: false },
      ],
    },
    intent: {
      value: 88,
      signals: [
        { label: "Web intent", value: "Demo request page ×2", good: true },
        { label: "Outreach activity", value: "Replied to nurture email", good: true },
        { label: "ABM Vertical Segmentation", value: "Tier 1 — Purchase stage", good: true },
        { label: "Recycled MQL", value: "None", good: false },
      ],
    },
  },
  "0015Y00000WAYN01": {
    fit: {
      value: 71,
      signals: [
        { label: "ICP match", value: "Diversified · large sub-entities", good: false },
        { label: "Product fit", value: "Intacct multi-entity", good: true },
        { label: "Vertical", value: "Mixed", good: false },
        { label: "Segment", value: "Enterprise sub-division", good: true },
      ],
    },
    intent: {
      value: 58,
      signals: [
        { label: "Web intent", value: "Blog visits only", good: false },
        { label: "Outreach activity", value: "No opens in 30 days", good: false },
        { label: "ABM Vertical Segmentation", value: "Tier 2 — Consideration", good: true },
        { label: "Recycled MQL", value: "DQ'd opp, fresh signal", good: true },
      ],
    },
  },
  "0015Y00000FBFH01": {
    fit: {
      value: 64,
      signals: [
        { label: "ICP match", value: "Healthcare nonprofit · FQHC", good: true },
        { label: "Product fit", value: "Intacct + grants tracking", good: true },
        { label: "Vertical", value: "Healthcare (secondary)", good: false },
        { label: "Segment", value: "SMB-mid", good: false },
      ],
    },
    intent: {
      value: 41,
      signals: [
        { label: "Web intent", value: "None detected", good: false },
        { label: "Outreach activity", value: "Never contacted", good: false },
        { label: "ABM Vertical Segmentation", value: "Tier 3", good: false },
        { label: "Recycled MQL", value: "Conference list import", good: true },
      ],
    },
  },
  "0015Y00000DNRC01": {
    fit: {
      value: 68,
      signals: [
        { label: "ICP match", value: "Nonprofit · national reach", good: true },
        { label: "Product fit", value: "Intacct core financials", good: true },
        { label: "Vertical", value: "Nonprofit (priority vertical)", good: true },
        { label: "Segment", value: "Large — verify sizing", good: false },
      ],
    },
    intent: {
      value: 45,
      signals: [
        { label: "Web intent", value: "None detected", good: false },
        { label: "Outreach activity", value: "Never contacted", good: false },
        { label: "ABM Vertical Segmentation", value: "Tier 3", good: false },
        { label: "Recycled MQL", value: "None", good: false },
      ],
    },
  },
};

// 6sense buying stage → intent baseline. A Decision-stage account shows far more
// intent than a Target-stage one; without a stage we assume low intent.
const INTENT_BY_STAGE: Record<string, number> = {
  Target: 34,
  Awareness: 48,
  Consideration: 63,
  Purchase: 77,
  Decision: 87,
};

// Rating → fit baseline (P1 is the strongest ICP match).
const FIT_BY_RATING: Record<string, number> = { P1: 82, P2: 70, P3: 59 };

/**
 * Deterministic ±range jitter derived from the account id, so accounts that
 * share a rating / buying stage don't all resolve to the identical score. Pure
 * function of the id (no Math.random) so scores are stable across renders.
 */
function idJitter(id: string, salt: string, range: number): number {
  let h = 2166136261;
  const s = `${id}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % (range * 2 + 1)) - range;
}

function clampScore(n: number): number {
  return Math.max(10, Math.min(95, Math.round(n)));
}

/**
 * Fit/intent for accounts not in FIT_INTENT_FIXTURES (all generated demo
 * accounts, most base accounts). Derived from the account's rating (fit) and
 * 6sense buying stage (intent) so the "Should I work it?" score actually
 * separates strong from weak accounts, rather than collapsing to a flat mid-50s.
 */
function defaultFitIntent(bundle: AccountBundle): { fit: ScorePillar; intent: ScorePillar } {
  const { account } = bundle;
  const priorityVertical = account.industry.toLowerCase().includes("nonprofit");

  const fitBase = account.rating ? FIT_BY_RATING[account.rating] : priorityVertical ? 62 : 55;
  const fitValue = clampScore(fitBase + (priorityVertical ? 4 : 0) + idJitter(account.id, "fit", 5));

  const stage = account.buyingStage ?? null;
  const intentBase = stage ? INTENT_BY_STAGE[stage] : 32;
  const intentValue = clampScore(intentBase + idJitter(account.id, "intent", 6));
  const highIntent = stage === "Purchase" || stage === "Decision";
  const midIntent = stage === "Consideration";

  return {
    fit: {
      value: fitValue,
      signals: [
        {
          label: "ICP match",
          value: `${account.industry}${priorityVertical ? " · priority vertical" : ""}`,
          good: priorityVertical || account.rating === "P1" || account.rating === "P2",
        },
        { label: "Product fit", value: `${account.product} core financials`, good: true },
        {
          label: "Rating",
          value: account.rating ? `${account.rating} account` : "Unrated",
          good: account.rating === "P1" || account.rating === "P2",
        },
        { label: "Segment", value: "Unknown", good: false },
      ],
    },
    intent: {
      value: intentValue,
      signals: [
        {
          label: "Web intent",
          value: highIntent
            ? "Active buying-stage signals this week"
            : midIntent
              ? "Some research activity"
              : "Low recent activity",
          good: highIntent || midIntent,
        },
        { label: "6sense Buying Stage", value: stage ?? "Not set", good: highIntent || midIntent },
        { label: "Outreach activity", value: "Never contacted", good: false },
      ],
    },
  };
}

function daysSince(dateString: string | null): number | null {
  if (!dateString) return null;
  return Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
}

/** Workability pillar is computed live from the Salesforce bundle + ROE result. */
function computeWorkability(bundle: AccountBundle, result: WorkabilityResult): ScorePillar {
  const contactCount = bundle.contacts.length;
  const roeClear = result.roe_status === "PASS";

  const activityDays = [
    ...bundle.leads.map((l) => daysSince(l.lastActivityDate)),
    ...bundle.contacts.map((c) => daysSince(c.lastActivityDate)),
    daysSince(bundle.account.lastActivityDate),
  ].filter((d): d is number => d !== null);
  const lastActivity = activityDays.length ? Math.min(...activityDays) : null;

  let value = 40;
  value += Math.min(contactCount, 3) * 10;
  if (lastActivity === null) value += 15; // never worked = fresh
  else if (lastActivity > 30) value += 10;
  else if (lastActivity > 7) value += 5;
  if (roeClear) value += 15;
  value = Math.min(value, 95);

  return {
    value,
    signals: [
      {
        label: "Contact availability",
        value: contactCount > 0 ? `${contactCount} contact${contactCount > 1 ? "s" : ""} on file` : "No contacts on file",
        good: contactCount >= 1,
      },
      {
        label: "Last activity",
        value: lastActivity === null ? "Never worked" : `${lastActivity} days ago`,
        good: lastActivity === null || lastActivity > 7,
      },
      {
        label: "ROE",
        value: roeClear ? "Clear — no competing claim" : "Conflict found",
        good: roeClear,
      },
    ],
  };
}

export function tierFor(priority: number): "P1" | "P2" | "P3" {
  return priority >= 75 ? "P1" : priority >= 50 ? "P2" : "P3";
}

// Nonprofit sizing for the Segment rule. Nonprofit revenue/FTE come from 990
// research at request time, which is too slow for the ranked worklist, so the
// scoring path uses these static estimates instead.
const NONPROFIT_SIZE: Record<string, { revenue: number | null; fte: number | null }> = {
  "0015Y00000GLBX01": { revenue: 18_400_000, fte: 240 },
  // Per latest 990 (tax year 2025): $26.7M revenue, 379 employees.
  "0015Y00000FBFH01": { revenue: 26_600_000, fte: 379 },
  "0015Y00000DNRC01": { revenue: 150_000_000, fte: 300 },
  "0015Y00002ABC123": { revenue: 5_000_000, fte: 40 },
};

// "Target" = no engagement or intent on the account from 6sense, so fit
// scores a bit lower than the fixture baseline.
const TARGET_STAGE_PENALTY = 10;

/** Account Buying Stage signal, read from the Global SF account record. */
function buyingStageSignal(bundle: AccountBundle): ScoreSignal {
  const stage = bundle.account.buyingStage ?? null;
  return {
    label: "Account Buying Stage",
    value: stage
      ? stage === "Target"
        ? "Target — no 6sense engagement"
        : stage
      : "Not set",
    good: stage !== null && stage !== "Target",
  };
}

/** Segment signal per the industry rules in lib/scoring/segment.ts. */
function segmentSignal(bundle: AccountBundle): ScoreSignal {
  const { account } = bundle;
  const intel = getCompanyIntel(account);
  const size = intel
    ? { revenue: intel.revenue.amount, fte: intel.employees.count }
    : (NONPROFIT_SIZE[account.id] ?? { revenue: null, fte: null });

  const segment = computeSegment(account.industry, size.revenue, size.fte);
  return { label: "Segment", value: segment.value, good: segment.good };
}

/**
 * "Should I work it?" score. Returns null for accounts blocked by the
 * de-dupe checks — scoring only applies to workable accounts.
 */
export function scoreAccount(bundle: AccountBundle, result: WorkabilityResult): AccountScore | null {
  if (result.final_status === "NOT WORKABLE") return null;

  const base = FIT_INTENT_FIXTURES[bundle.account.id] ?? defaultFitIntent(bundle);
  const { intent } = base;
  const isTarget = bundle.account.buyingStage === "Target";
  // Replace the fixture Segment signal with the computed one (industry rules)
  // and append the Account Buying Stage from Global SF.
  const fit: ScorePillar = {
    value: Math.max(0, base.fit.value - (isTarget ? TARGET_STAGE_PENALTY : 0)),
    signals: [
      ...base.fit.signals.map((s) => (s.label === "Segment" ? segmentSignal(bundle) : s)),
      buyingStageSignal(bundle),
    ],
  };
  const workability = computeWorkability(bundle, result);

  const priority = Math.round(
    fit.value * SCORE_WEIGHTS.fit +
      intent.value * SCORE_WEIGHTS.intent +
      workability.value * SCORE_WEIGHTS.workability,
  );

  // Tier comes from the Rating field on the Global SF account record;
  // fall back to the score-derived tier only when Rating is blank.
  const tier = bundle.account.rating ?? tierFor(priority);

  return { fit, intent, workability, priority, tier };
}
