import type { SdrLead } from "@/lib/leads/types";

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
    fit: 85,
    intent: 82,
    workability: 73,
    score: 81,
  },
  {
    id: "00Q5Y00000MARCU1",
    name: "Marcus Webb",
    title: "Controller",
    accountId: "0015Y00000GLBX01", // Globex Nonprofit
    ownerName: "House Account",
    status: "Open - Not Contacted",
    priorityGroup: "P1",
    fit: 86,
    intent: 74,
    workability: 75,
    score: 79,
  },
  {
    id: "00Q5Y00000PRIYA1",
    name: "Priya Nair",
    title: "Director of Ops",
    accountId: "0015Y00000WAYN01", // Wayne Enterprises
    ownerName: "House Account",
    status: "Open - Not Contacted",
    priorityGroup: "P2/3",
    fit: 71,
    intent: 60,
    workability: 72,
    score: 67,
  },
  {
    id: "00Q5Y00000JAMES1",
    name: "James O'Brien",
    title: "CFO",
    accountId: null, // no linked account
    ownerName: "House Account",
    status: "Open - Not Contacted",
    priorityGroup: "P2/3",
    fit: 62,
    intent: 58,
    workability: 53,
    score: 58,
  },
  {
    id: "00Q5Y00000LENA01",
    name: "Lena Faust",
    title: "Finance Manager",
    accountId: "0015Y00000DNRC01", // DonorsChoose
    ownerName: "House Account",
    status: "Open - Not Contacted",
    priorityGroup: "P4/5",
    fit: 64,
    intent: 45,
    workability: 60,
    score: 56,
  },
  {
    id: "00Q5Y00000TOM001",
    name: "Tom Alvarez",
    title: "Accounting Lead",
    accountId: "0015Y00000FBFH01", // Fort Bend Family Health Center Inc
    ownerName: "House Account",
    status: "Open - Not Contacted",
    priorityGroup: "P4/5",
    fit: 62,
    intent: 40,
    workability: 56,
    score: 53,
  },
];
