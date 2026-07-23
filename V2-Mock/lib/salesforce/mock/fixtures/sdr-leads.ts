import type { SdrLead } from "@/lib/leads/types";
import { DEMO_SDR_LEADS } from "@/lib/salesforce/mock/fixtures/demo-accounts";

// Mock SDR worklist leads (build-plan step 5). Mirrors the existing accounts and
// includes one lead with no account (James O'Brien) to exercise the subline and
// N/A-degradation logic. Scores match the build-plan table; fit/intent/work are
// fixture-driven and roughly reconcile to the overall score.
export const SDR_LEADS: SdrLead[] = [
  {
    id: "00Q5Y00000SARAH1",
    name: "Sarah Chen",
    title: "VP Finance",
    accountId: "0015Y00000ACME01", // Acme Robotics
    ownerName: "House Account",
    status: "Open - Not Contacted",
    priorityGroup: "P1",
    product: "Intacct",
    fit: 85,
    intent: 82,
    workability: 73,
    score: 81,
    email: "sarah.chen@acme.com",
  },
  {
    id: "00Q5Y00000MARCU1",
    name: "Marcus Webb",
    title: "Controller",
    accountId: "0015Y00000GLBX01", // Globex Nonprofit
    ownerName: "House Account",
    status: "Open - Not Contacted",
    priorityGroup: "P1",
    product: "Intacct",
    fit: 86,
    intent: 74,
    workability: 75,
    score: 79,
    email: "marcus.webb@globex.org",
  },
  {
    id: "00Q5Y00000PRIYA1",
    name: "Priya Nair",
    title: "Director of Ops",
    accountId: "0015Y00000WAYN01", // Wayne Enterprises
    ownerName: "House Account",
    status: "Open - Not Contacted",
    priorityGroup: "P2/3",
    product: "CRE",
    fit: 71,
    intent: 60,
    workability: 72,
    score: 67,
    email: "priya.nair@wayne.com",
  },
  {
    id: "00Q5Y00000JAMES1",
    name: "James O'Brien",
    title: "CFO",
    accountId: null, // no linked account
    ownerName: "House Account",
    status: "Open - Not Contacted",
    priorityGroup: "P2/3",
    product: "Intacct",
    fit: 62,
    intent: 58,
    workability: 53,
    score: 58,
    // No linked account, and a personal/ISP email (shaw.ca) — company name and
    // email still show, but no company domain can be inferred (the exception).
    company: "Brightpeak Advisory",
    email: "james.obrien@shaw.ca",
    source: "INT_23Q3_NCA_US_0009NFPProductTour",
  },
  {
    id: "00Q5Y00000LENA01",
    name: "Lena Faust",
    title: "Finance Manager",
    accountId: "0015Y00000DNRC01", // DonorsChoose
    ownerName: "House Account",
    status: "Open - Not Contacted",
    priorityGroup: "P4/5",
    product: "Intacct",
    fit: 64,
    intent: 45,
    workability: 60,
    score: 56,
    email: "lena.faust@donorschoose.org",
  },
  {
    id: "00Q5Y00000TOM001",
    name: "Tom Alvarez",
    title: "Accounting Lead",
    accountId: "0015Y00000FBFH01", // Fort Bend Family Health Center Inc
    ownerName: "House Account",
    status: "Open - Not Contacted",
    priorityGroup: "P4/5",
    product: "SSG",
    fit: 62,
    intent: 40,
    workability: 56,
    score: 53,
    email: "tom.alvarez@myaccesshealth.org",
  },

  // Generated per-product demo leads (10 per product line) exercising a spread
  // of "Can I work this lead?" outcomes. See demo-accounts.ts.
  ...DEMO_SDR_LEADS,
];
