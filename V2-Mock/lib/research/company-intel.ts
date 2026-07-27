import type { Account } from "@/lib/salesforce/types";

/**
 * Non-nonprofit research intel. Nonprofits keep the ProPublica (990) path;
 * every other industry is researched via web search plus two integrations:
 * revenue from ZoomInfo, full-time employees from LinkedIn Sales Navigator.
 *
 * Those integrations aren't wired in this mock, so the intel is fixture-driven
 * per account and labeled with the source each field would come from.
 */

export interface HiringSignal {
  role: string;
  postedDaysAgo: number;
  source: string;
  descriptionSnippet: string;
  /** Software / skill clues parsed from the job description. */
  clues: string[];
}

export interface FundingEvent {
  round: string;
  amount: string;
  date: string;
  investors: string;
}

export interface CompanyIntel {
  revenue: { amount: number | null; source: "ZoomInfo" };
  employees: { count: number | null; source: "LinkedIn Sales Navigator" };
  hqLocation: string | null;
  /** Entities / locations footprint, e.g. "4 plants + HQ" or "12 legal entities". */
  locations: string | null;
  parentAccount: string | null;
  /** Recent funding — only relevant for Financial Services / Software. */
  funding: FundingEvent | null;
  growthSignals: string[];
  hiringSignals: HiringSignal[];
}

const INTEL_FIXTURES: Record<string, CompanyIntel> = {
  "0015Y00000ACME01": {
    revenue: { amount: 62_000_000, source: "ZoomInfo" },
    employees: { count: 580, source: "LinkedIn Sales Navigator" },
    hqLocation: "Albuquerque, NM",
    locations: "4 plants + HQ (NM, TX, OH)",
    parentAccount: null,
    funding: null,
    growthSignals: [
      "Headcount +14% over the last 12 months (LinkedIn)",
      "Opened new warehouse-automation line in Ohio (press release, 2 months ago)",
      "Three new product lines launched in warehouse automation",
    ],
    hiringSignals: [
      {
        role: "Corporate Controller",
        postedDaysAgo: 12,
        source: "LinkedIn Jobs",
        descriptionSnippet:
          "Own month-end close across 4 plants; lead migration off QuickBooks Enterprise to a modern cloud ERP; inventory and multi-entity consolidation experience required.",
        clues: ["QuickBooks Enterprise (outgrowing)", "ERP migration planned", "Multi-entity consolidation", "Inventory accounting"],
      },
      {
        role: "Senior Cost Accountant",
        postedDaysAgo: 26,
        source: "Company careers page",
        descriptionSnippet:
          "Standard costing for robotics assembly; heavy Excel today, moving to automated reporting.",
        clues: ["Heavy Excel (manual process)", "Standard costing"],
      },
    ],
  },
  "0015Y00000WAYN01": {
    revenue: { amount: 310_000_000, source: "ZoomInfo" },
    employees: { count: 2_400, source: "LinkedIn Sales Navigator" },
    hqLocation: "Gotham City, NJ",
    locations: "12 legal entities (Foundation arm: 3)",
    parentAccount: "Wayne Holdings LLC",
    funding: null,
    growthSignals: [
      "Foundation arm consolidating books across 12 entities",
      "Flagged close-cycle pain in a webinar Q&A (3 weeks ago)",
      "New CFO appointed at Wayne Foundation (LinkedIn, 2 months ago)",
    ],
    hiringSignals: [
      {
        role: "Senior Accountant — Consolidations",
        postedDaysAgo: 9,
        source: "LinkedIn Jobs",
        descriptionSnippet:
          "Multi-entity consolidation across 12 LLCs; intercompany eliminations currently in spreadsheets; Sage Intacct experience a plus.",
        clues: ["Sage Intacct named in posting", "Spreadsheet-based eliminations", "12-entity consolidation"],
      },
    ],
  },
  "0015Y00000INTD01": {
    revenue: { amount: 45_000_000, source: "ZoomInfo" },
    employees: { count: 320, source: "LinkedIn Sales Navigator" },
    hqLocation: "Austin, TX",
    locations: "2 offices (Austin, Denver)",
    parentAccount: null,
    funding: null,
    growthSignals: ["Steady headcount; payroll processed via Global (existing customer)"],
    hiringSignals: [],
  },
  "0015Y00000HOOL01": {
    revenue: { amount: 120_000_000, source: "ZoomInfo" },
    employees: { count: 850, source: "LinkedIn Sales Navigator" },
    hqLocation: "Palo Alto, CA",
    locations: "HQ + 3 international offices",
    parentAccount: null,
    funding: {
      round: "Series D",
      amount: "$85M",
      date: "4 months ago",
      investors: "Raviga Capital, Bream-Hall",
    },
    growthSignals: [
      "Headcount +22% since Series D (LinkedIn)",
      "Expanding into compression-as-a-service platform",
    ],
    hiringSignals: [
      {
        role: "VP Finance",
        postedDaysAgo: 18,
        source: "LinkedIn Jobs",
        descriptionSnippet:
          "Scale finance post-Series D; implement first real ERP (currently NetSuite trial + spreadsheets); ASC 606 revenue recognition for SaaS.",
        clues: ["NetSuite trial (competitive)", "ASC 606 / SaaS rev rec", "Post-funding ERP purchase window"],
      },
    ],
  },
  "0015Y00000STRK01": {
    revenue: { amount: 890_000_000, source: "ZoomInfo" },
    employees: { count: 6_100, source: "LinkedIn Sales Navigator" },
    hqLocation: "Los Angeles, CA",
    locations: "9 facilities (aerospace + defense)",
    parentAccount: "Stark Holdings",
    funding: null,
    growthSignals: ["New defense contract announced (public filings, 6 weeks ago)"],
    hiringSignals: [],
  },
  "0015Y00000UMBP01": {
    revenue: { amount: 210_000_000, source: "ZoomInfo" },
    employees: { count: 1_450, source: "LinkedIn Sales Navigator" },
    hqLocation: "Raccoon City, PA",
    locations: "3 research campuses + HQ",
    parentAccount: "Umbrella Holdings AG",
    funding: null,
    growthSignals: ["R&D expansion at Pennsylvania campus (local news, 1 month ago)"],
    hiringSignals: [
      {
        role: "Director of Financial Reporting",
        postedDaysAgo: 31,
        source: "Company careers page",
        descriptionSnippet:
          "GxP-compliant financial controls; consolidation across research entities; SAP experience preferred.",
        clues: ["SAP incumbent", "Multi-entity consolidation"],
      },
    ],
  },
  "0015Y00000UMBS01": {
    revenue: { amount: 38_000_000, source: "ZoomInfo" },
    employees: { count: 410, source: "LinkedIn Sales Navigator" },
    hqLocation: "Chicago, IL",
    locations: "HQ + 6 regional security ops centers",
    parentAccount: null,
    funding: {
      round: "Growth equity",
      amount: "$40M",
      date: "7 months ago",
      investors: "CloudServe Ventures",
    },
    growthSignals: ["Two new regional ops centers opened this year"],
    hiringSignals: [
      {
        role: "Finance Manager",
        postedDaysAgo: 14,
        source: "LinkedIn Jobs",
        descriptionSnippet:
          "Multi-location P&L reporting; currently on QuickBooks Online with manual consolidation.",
        clues: ["QuickBooks Online (outgrowing)", "Manual multi-location consolidation"],
      },
    ],
  },
};

// ZoomInfo / LinkedIn Sales Navigator intel for standalone (no-account) leads at
// real for-profit companies, keyed by email domain. Nonprofits are not here —
// they use the ProPublica (990) path. Figures approximate public reporting.
const INTEL_BY_DOMAIN: Record<string, CompanyIntel> = {
  "zapier.com": {
    revenue: { amount: 310_000_000, source: "ZoomInfo" },
    employees: { count: 900, source: "LinkedIn Sales Navigator" },
    hqLocation: "San Francisco, CA (remote-first)",
    locations: "Fully distributed — 40+ countries",
    parentAccount: null,
    funding: { round: "Secondary", amount: "$5B valuation", date: "2021", investors: "Sequoia, Steadfast" },
    growthSignals: [
      "Headcount +12% over the last 12 months (LinkedIn)",
      "Expanded into enterprise automation and AI orchestration (press, 2 months ago)",
    ],
    hiringSignals: [
      {
        role: "Corporate Controller",
        postedDaysAgo: 15,
        source: "LinkedIn Jobs",
        descriptionSnippet:
          "Own the monthly close for a fast-scaling SaaS business; consolidate multiple entities; move off spreadsheets to a modern cloud ERP.",
        clues: ["Multi-entity SaaS", "Spreadsheet-based close (outgrowing)", "Cloud ERP evaluation"],
      },
    ],
  },
  "gusto.com": {
    revenue: { amount: 500_000_000, source: "ZoomInfo" },
    employees: { count: 2_800, source: "LinkedIn Sales Navigator" },
    hqLocation: "San Francisco, CA",
    locations: "3 offices (San Francisco, Denver, New York)",
    parentAccount: null,
    funding: { round: "Series E", amount: "$175M", date: "2 years ago", investors: "T. Rowe Price, Generation" },
    growthSignals: [
      "Headcount +18% post-Series E (LinkedIn)",
      "Launched embedded-finance product line (press, 6 weeks ago)",
    ],
    hiringSignals: [
      {
        role: "Senior Manager, Accounting",
        postedDaysAgo: 9,
        source: "LinkedIn Jobs",
        descriptionSnippet:
          "Scale the accounting function; implement ASC 606 revenue recognition; multi-entity consolidation across three offices.",
        clues: ["ASC 606 / SaaS rev rec", "Multi-entity consolidation", "Finance systems implementation"],
      },
    ],
  },
  "bombas.com": {
    revenue: { amount: 300_000_000, source: "ZoomInfo" },
    employees: { count: 190, source: "LinkedIn Sales Navigator" },
    hqLocation: "New York, NY",
    locations: "HQ + distribution center",
    parentAccount: null,
    funding: null,
    growthSignals: [
      "Crossed $100M in lifetime donated pairs (press, 1 month ago)",
      "Expanding wholesale/retail distribution channel",
    ],
    hiringSignals: [
      {
        role: "Director of Finance",
        postedDaysAgo: 21,
        source: "Company careers page",
        descriptionSnippet:
          "Own inventory accounting and margin reporting for a DTC + wholesale apparel business; currently heavy on QuickBooks + Excel.",
        clues: ["QuickBooks (outgrowing)", "Inventory accounting", "DTC + wholesale"],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Deterministic synthetic firmographics
//
// ZoomInfo / LinkedIn Sales Navigator aren't wired in this mock, and only a
// handful of accounts have hand-authored intel above. Every other account and
// standalone lead would otherwise render "Not available / Not found / None
// found" for revenue, employees, HQ, locations, parent and funding. To keep the
// account-fit audit populated everywhere, synthesize plausible,
// industry-appropriate figures deterministically from a stable seed (account id
// or email domain) — the same fixed-index philosophy the generated demo
// accounts use, so values never change between runs. These are mock numbers,
// not real-company data; hand-authored fixtures above always take precedence.
// ---------------------------------------------------------------------------

function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic pick from `seed` + a salt, so independent fields vary. */
function pick<T>(arr: T[], seed: string, salt: string): T {
  return arr[hashString(`${seed}:${salt}`) % arr.length];
}

// Revenue/employee pairs per industry — kept correlated (revenue tracks
// headcount) and inside a believable band for each vertical.
const FIRMO_BANDS: Record<string, { revenue: number; employees: number }[]> = {
  Manufacturing: [
    { revenue: 42_000_000, employees: 380 },
    { revenue: 88_000_000, employees: 740 },
    { revenue: 156_000_000, employees: 1_250 },
    { revenue: 240_000_000, employees: 2_050 },
  ],
  Healthcare: [
    { revenue: 55_000_000, employees: 460 },
    { revenue: 120_000_000, employees: 980 },
    { revenue: 205_000_000, employees: 1_600 },
    { revenue: 330_000_000, employees: 2_700 },
  ],
  Technology: [
    { revenue: 28_000_000, employees: 180 },
    { revenue: 64_000_000, employees: 420 },
    { revenue: 130_000_000, employees: 820 },
    { revenue: 260_000_000, employees: 1_500 },
  ],
  "Wholesale Distribution": [
    { revenue: 70_000_000, employees: 210 },
    { revenue: 145_000_000, employees: 380 },
    { revenue: 280_000_000, employees: 640 },
    { revenue: 460_000_000, employees: 1_050 },
  ],
  "Financial Services": [
    { revenue: 48_000_000, employees: 240 },
    { revenue: 110_000_000, employees: 520 },
    { revenue: 220_000_000, employees: 980 },
    { revenue: 400_000_000, employees: 1_700 },
  ],
  "Business Services": [
    { revenue: 22_000_000, employees: 160 },
    { revenue: 52_000_000, employees: 390 },
    { revenue: 98_000_000, employees: 720 },
    { revenue: 175_000_000, employees: 1_300 },
  ],
  Hospitality: [
    { revenue: 36_000_000, employees: 520 },
    { revenue: 82_000_000, employees: 1_150 },
    { revenue: 148_000_000, employees: 2_100 },
    { revenue: 265_000_000, employees: 3_800 },
  ],
  Nonprofit: [
    { revenue: 6_400_000, employees: 48 },
    { revenue: 18_500_000, employees: 130 },
    { revenue: 42_000_000, employees: 310 },
    { revenue: 96_000_000, employees: 620 },
  ],
};

const DEFAULT_BAND = FIRMO_BANDS["Business Services"];

const HQ_CITIES = [
  "Columbus, OH", "Austin, TX", "Denver, CO", "Charlotte, NC",
  "Portland, OR", "Nashville, TN", "Kansas City, MO", "Tampa, FL",
  "Salt Lake City, UT", "Raleigh, NC", "Minneapolis, MN", "Phoenix, AZ",
];

function bandFor(industry: string): { revenue: number; employees: number }[] {
  const key = Object.keys(FIRMO_BANDS).find((k) =>
    industry.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? FIRMO_BANDS[key] : DEFAULT_BAND;
}

function footprintFor(industry: string, seed: string): string {
  const ind = industry.toLowerCase();
  const n = 2 + (hashString(`${seed}:sites`) % 6); // 2..7
  if (ind.includes("manufactur")) return `${n} plants + HQ`;
  if (ind.includes("wholesale") || ind.includes("distribution")) return `${n} distribution centers + HQ`;
  if (ind.includes("health")) return `${n} clinics + corporate HQ`;
  if (ind.includes("hospitality")) return `${n} properties + HQ`;
  if (ind.includes("financial")) return `${n} regional offices`;
  if (ind.includes("nonprofit")) return `${n} program sites + HQ`;
  return `HQ + ${n} offices`;
}

const FUNDING_ROUNDS: Omit<FundingEvent, "date">[] = [
  { round: "Series B", amount: "$32M", investors: "Emergence Capital, Bessemer" },
  { round: "Series C", amount: "$68M", investors: "Insight Partners" },
  { round: "Series D", amount: "$110M", investors: "Meritech, ICONIQ" },
  { round: "Growth equity", amount: "$45M", investors: "Vista Equity Partners" },
];
const FUNDING_AGES = ["3 months ago", "5 months ago", "8 months ago", "11 months ago"];

function fundingFor(industry: string, seed: string): FundingEvent | null {
  const ind = industry.toLowerCase();
  // Funding is only surfaced for Technology / Financial Services (per the
  // FundingEvent doc comment), and only for roughly half of those.
  if (!ind.includes("technology") && !ind.includes("financial")) return null;
  if (hashString(`${seed}:hasfunding`) % 2 !== 0) return null;
  return { ...pick(FUNDING_ROUNDS, seed, "round"), date: pick(FUNDING_AGES, seed, "fundage") };
}

function parentFor(displayName: string, seed: string): string | null {
  if (hashString(`${seed}:parent`) % 3 !== 0) return null; // ~1/3 have a parent
  const first = displayName.trim().split(/\s+/)[0] || "Meridian";
  const suffix = pick(["Holdings", "Group", "Global Holdings", "Capital Partners"], seed, "parentsuffix");
  return `${first} ${suffix}`;
}

function growthFor(hq: string, seed: string): string[] {
  const pct = pick([8, 11, 14, 17, 22], seed, "growthpct");
  const months = 1 + (hashString(`${seed}:mo`) % 5);
  const second = pick(
    [
      `New office/location activity near ${hq} (press, ${months} months ago)`,
      "Expanded product/service lines this year (company blog)",
      "New finance leadership hire flagged on LinkedIn (recent)",
    ],
    seed,
    "growth2",
  );
  return [`Headcount +${pct}% over the last 12 months (LinkedIn)`, second];
}

function syntheticIntel(seed: string, industry: string, displayName: string): CompanyIntel {
  const size = pick(bandFor(industry), seed, "size");
  const hq = pick(HQ_CITIES, seed, "hq");
  return {
    revenue: { amount: size.revenue, source: "ZoomInfo" },
    employees: { count: size.employees, source: "LinkedIn Sales Navigator" },
    hqLocation: hq,
    locations: footprintFor(industry, seed),
    parentAccount: parentFor(displayName, seed),
    funding: fundingFor(industry, seed),
    growthSignals: growthFor(hq, seed),
    hiringSignals: [],
  };
}

/**
 * Deterministic 990-style financials for nonprofit demo accounts with no live
 * ProPublica/website data. Nonprofits keep the 990 presentation, so only the
 * revenue + employee figures are synthesized (not the ZoomInfo intel shape).
 */
export function syntheticNonprofitFinancials(seed: string): { revenue: number; employees: number } {
  return pick(FIRMO_BANDS.Nonprofit, seed, "npsize");
}

function displayNameFromDomain(domain: string): string {
  const base = domain.split(".")[0] ?? domain;
  return (
    base
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || domain
  );
}

/**
 * ZoomInfo/LinkedIn intel for a for-profit company by domain. Returns null only
 * when no domain can be inferred (e.g. a personal-email lead); otherwise falls
 * back to deterministic synthetic firmographics keyed off the domain.
 */
export function getCompanyIntelByDomain(domain: string, industry = "Technology"): CompanyIntel | null {
  const key = domain.trim().toLowerCase();
  if (!key) return null;
  return INTEL_BY_DOMAIN[key] ?? syntheticIntel(key, industry, displayNameFromDomain(key));
}

function isNonprofit(account: Account): boolean {
  return account.industry.toLowerCase().includes("nonprofit");
}

/**
 * Returns web/integration intel for non-nonprofit accounts; null for
 * nonprofits (they use the ProPublica 990 path instead). Accounts without a
 * hand-authored fixture get deterministic synthetic firmographics so the fit
 * card is never blank.
 */
export function getCompanyIntel(account: Account): CompanyIntel | null {
  if (isNonprofit(account)) return null;
  return INTEL_FIXTURES[account.id] ?? syntheticIntel(account.id, account.industry, account.name);
}
