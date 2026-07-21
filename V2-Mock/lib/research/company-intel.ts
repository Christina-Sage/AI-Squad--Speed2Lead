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
  "0015Y00000MERD01": {
    revenue: { amount: 96_000_000, source: "ZoomInfo" },
    employees: { count: 420, source: "LinkedIn Sales Navigator" },
    hqLocation: "Boston, MA",
    locations: "HQ + 5 regional advisory offices",
    parentAccount: null,
    funding: {
      round: "Growth equity",
      amount: "$120M",
      date: "5 months ago",
      investors: "Summit Partners",
    },
    growthSignals: [
      "AUM crossed $8B this year (press release, 6 weeks ago)",
      "Acquired a regional RIA (2 months ago) — integrating a second GL",
    ],
    hiringSignals: [
      {
        role: "Director of Fund Accounting",
        postedDaysAgo: 10,
        source: "LinkedIn Jobs",
        descriptionSnippet:
          "Consolidate books across newly acquired RIA; multi-entity fund accounting currently split between two systems; seeking a cloud financial platform.",
        clues: ["Two GLs post-acquisition", "Multi-entity consolidation", "Cloud ERP evaluation"],
      },
    ],
  },
  "0015Y00000CSTL01": {
    revenue: { amount: 74_000_000, source: "ZoomInfo" },
    employees: { count: 1_200, source: "LinkedIn Sales Navigator" },
    hqLocation: "Miami, FL",
    locations: "9 properties across FL, GA, SC",
    parentAccount: null,
    funding: null,
    growthSignals: [
      "Two new coastal properties opening next quarter",
      "Property-level P&L consolidation flagged as a pain point (webinar Q&A, 1 month ago)",
    ],
    hiringSignals: [
      {
        role: "Corporate Controller",
        postedDaysAgo: 16,
        source: "LinkedIn Jobs",
        descriptionSnippet:
          "Own consolidation across 9 properties; each property currently closes independently in QuickBooks; standardize onto one cloud platform.",
        clues: ["Per-property QuickBooks (outgrowing)", "9-property consolidation", "Cloud ERP standardization"],
      },
    ],
  },
  "0015Y00000NMBS01": {
    revenue: { amount: 54_000_000, source: "ZoomInfo" },
    employees: { count: 360, source: "LinkedIn Sales Navigator" },
    hqLocation: "San Francisco, CA",
    locations: "HQ + remote-first",
    parentAccount: null,
    funding: {
      round: "Series B",
      amount: "$60M",
      date: "3 months ago",
      investors: "Lightspeed, Bessemer",
    },
    growthSignals: [
      "Headcount +31% since Series B (LinkedIn)",
      "Launching usage-based billing tier — ASC 606 complexity increasing",
    ],
    hiringSignals: [
      {
        role: "VP Finance",
        postedDaysAgo: 8,
        source: "LinkedIn Jobs",
        descriptionSnippet:
          "First finance leadership hire post-Series B; implement a real ERP (currently spreadsheets + a starter tool); own SaaS ASC 606 revenue recognition.",
        clues: ["Spreadsheet-based finance", "ASC 606 / SaaS rev rec", "Post-funding ERP purchase window"],
      },
    ],
  },
  "0015Y00000CNST01": {
    revenue: { amount: 22_000_000, source: "ZoomInfo" },
    employees: { count: 140, source: "LinkedIn Sales Navigator" },
    hqLocation: "Kansas City, MO",
    locations: "HQ + 2 branch offices",
    parentAccount: null,
    funding: null,
    growthSignals: ["Steady growth; evaluating tools to replace manual close (3-week close cycle)"],
    hiringSignals: [
      {
        role: "Senior Accountant",
        postedDaysAgo: 21,
        source: "Company careers page",
        descriptionSnippet:
          "Month-end close currently heavy on spreadsheets; help select and implement a cloud accounting platform.",
        clues: ["Heavy Excel (manual process)", "Cloud accounting selection"],
      },
    ],
  },
  "0015Y00000VRTX01": {
    revenue: { amount: 180_000_000, source: "ZoomInfo" },
    employees: { count: 1_650, source: "LinkedIn Sales Navigator" },
    hqLocation: "Memphis, TN",
    locations: "14 distribution terminals",
    parentAccount: null,
    funding: null,
    growthSignals: ["Fleet expansion announced (trade press, 1 month ago)"],
    hiringSignals: [],
  },
  "0015Y00000RDWD01": {
    revenue: { amount: 88_000_000, source: "ZoomInfo" },
    employees: { count: 640, source: "LinkedIn Sales Navigator" },
    hqLocation: "Portland, OR",
    locations: "6 regional freight hubs",
    parentAccount: null,
    funding: null,
    growthSignals: ["New Pacific Northwest hub opened this year"],
    hiringSignals: [
      {
        role: "Controller",
        postedDaysAgo: 19,
        source: "LinkedIn Jobs",
        descriptionSnippet:
          "Consolidate across 6 hubs; currently on QuickBooks Enterprise with manual intercompany.",
        clues: ["QuickBooks Enterprise (outgrowing)", "Manual intercompany"],
      },
    ],
  },
};

function isNonprofit(account: Account): boolean {
  return account.industry.toLowerCase().includes("nonprofit");
}

/**
 * Returns web/integration intel for non-nonprofit accounts; null for
 * nonprofits (they use the ProPublica 990 path instead).
 */
export function getCompanyIntel(account: Account): CompanyIntel | null {
  if (isNonprofit(account)) return null;

  return (
    INTEL_FIXTURES[account.id] ?? {
      revenue: { amount: null, source: "ZoomInfo" },
      employees: { count: null, source: "LinkedIn Sales Navigator" },
      hqLocation: null,
      locations: null,
      parentAccount: null,
      funding: null,
      growthSignals: [],
      hiringSignals: [],
    }
  );
}
