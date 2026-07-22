import type { PriorityGroup } from "@/lib/priority";
import { SCORE_WEIGHTS } from "@/lib/scoring/scoring";

/**
 * Web-form lead intake (the `/simulate` flow).
 *
 * This is the mock stand-in for the real pipeline: a marketing web form feeds
 * Eloqua, which normalizes/enriches the record and pushes it to Salesforce,
 * where LeanData routes it to an SDR. We do NOT replicate Eloqua or LeanData
 * (no API keys, and out of scope) — instead this module does the one piece that
 * makes the simulation useful end-to-end: turn raw form fields into a scored,
 * prioritized lead that lands in the SDR worklist, exactly like the fixture
 * leads. The scoring here is a transparent, rules-based proxy for the enrichment
 * a real Eloqua/6sense/intent stack would supply.
 */

export const COMPANY_SIZES = ["1–50", "51–200", "201–500", "501–1000", "1000+"] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export const INDUSTRIES = [
  "Nonprofit",
  "Financial Services",
  "Manufacturing",
  "Healthcare",
  "Technology",
  "Other",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const PRODUCTS = ["Sage Intacct", "Sage People", "Not sure yet"] as const;
export type ProductInterest = (typeof PRODUCTS)[number];

export const TIMEFRAMES = ["Immediately", "This quarter", "This year", "Just researching"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const REQUEST_TYPES = [
  "Requested a demo",
  "Contacted sales",
  "Downloaded content",
  "Newsletter signup",
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export interface LeadIntakeInput {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  companySize: CompanySize;
  industry: Industry;
  productInterest: ProductInterest;
  timeframe: Timeframe;
  requestType: RequestType;
  message?: string;
}

export interface LeadIntakeDerived {
  fit: number;
  intent: number;
  workability: number;
  score: number;
  priorityGroup: PriorityGroup;
  source: string;
  /** Human-readable notes on how each pillar was derived (for the result view). */
  reasons: { fit: string[]; intent: string[]; workability: string[] };
}

function clamp(value: number, min = 0, max = 95): number {
  return Math.max(min, Math.min(max, value));
}

/** Seniority signal parsed from the free-text job title. */
function seniority(jobTitle: string): { points: number; label: string } {
  const t = jobTitle.toLowerCase();
  if (/\b(cfo|ceo|coo|cto|chief|founder|owner|president)\b/.test(t) || t.startsWith("c-"))
    return { points: 22, label: "C-level / owner — economic buyer" };
  if (/\b(vp|vice president|head of)\b/.test(t)) return { points: 18, label: "VP / Head of — decision maker" };
  if (/\bdirector\b/.test(t)) return { points: 14, label: "Director — strong influencer" };
  if (/\b(controller|treasurer)\b/.test(t)) return { points: 14, label: "Finance leader — key persona" };
  if (/\bmanager\b/.test(t)) return { points: 8, label: "Manager — influencer" };
  return { points: 3, label: "Individual contributor — low buying power" };
}

const SIZE_POINTS: Record<CompanySize, { points: number; label: string }> = {
  "1–50": { points: 4, label: "1–50 FTE — below core ICP" },
  "51–200": { points: 12, label: "51–200 FTE — lower mid-market" },
  "201–500": { points: 18, label: "201–500 FTE — core ICP sweet spot" },
  "501–1000": { points: 15, label: "501–1000 FTE — upper mid-market" },
  "1000+": { points: 8, label: "1000+ FTE — enterprise, longer cycle" },
};

const INDUSTRY_POINTS: Record<Industry, { points: number; label: string }> = {
  Nonprofit: { points: 12, label: "Nonprofit — priority vertical" },
  "Financial Services": { points: 9, label: "Financial Services — strong fit" },
  Manufacturing: { points: 8, label: "Manufacturing — good fit" },
  Healthcare: { points: 8, label: "Healthcare — good fit" },
  Technology: { points: 6, label: "Technology — moderate fit" },
  Other: { points: 2, label: "Other industry — unqualified vertical" },
};

const TIMEFRAME_POINTS: Record<Timeframe, { points: number; label: string }> = {
  Immediately: { points: 42, label: "Buying immediately — hot" },
  "This quarter": { points: 30, label: "Buying this quarter — high intent" },
  "This year": { points: 16, label: "Buying this year — mid intent" },
  "Just researching": { points: 5, label: "Just researching — early stage" },
};

const REQUEST_POINTS: Record<RequestType, { points: number; label: string }> = {
  "Requested a demo": { points: 26, label: "Requested a demo — strong hand-raise" },
  "Contacted sales": { points: 22, label: "Contacted sales — direct interest" },
  "Downloaded content": { points: 10, label: "Downloaded content — soft signal" },
  "Newsletter signup": { points: 3, label: "Newsletter signup — minimal intent" },
};

function toPriorityGroup(score: number): PriorityGroup {
  if (score >= 75) return "P1";
  if (score >= 55) return "P2/3";
  return "P4/5";
}

/**
 * Derive the Fit / Intent / Workability pillars and overall "Should I work it?"
 * score from the raw form fields, using the same weights the account/lead
 * scoring uses elsewhere so the numbers reconcile across the app.
 */
export function deriveLead(input: LeadIntakeInput): LeadIntakeDerived {
  // --- Fit: who they are (persona × size × vertical) ---
  const sen = seniority(input.jobTitle);
  const size = SIZE_POINTS[input.companySize];
  const ind = INDUSTRY_POINTS[input.industry];
  const fit = clamp(45 + sen.points + size.points + ind.points);

  // --- Intent: how ready they are (timeframe × how they engaged) ---
  const tf = TIMEFRAME_POINTS[input.timeframe];
  const req = REQUEST_POINTS[input.requestType];
  const intent = clamp(20 + tf.points + req.points);

  // --- Workability: a net-new inbound lead is unassigned (House-owned), never
  // worked, and ROE-clear, but has no linked account yet — so it starts
  // moderately workable, mirroring the null-account case in lead-scoring.ts.
  const workability = 60;

  const score = Math.round(
    fit * SCORE_WEIGHTS.fit + intent * SCORE_WEIGHTS.intent + workability * SCORE_WEIGHTS.workability,
  );

  return {
    fit,
    intent,
    workability,
    score,
    priorityGroup: toPriorityGroup(score),
    source: `Web form — ${input.requestType}`,
    reasons: {
      fit: [sen.label, size.label, ind.label],
      intent: [tf.label, req.label],
      workability: [
        "Unassigned (House) — no ROE conflict",
        "Never worked — fresh",
        "No linked account yet — confirm/create on work",
      ],
    },
  };
}
