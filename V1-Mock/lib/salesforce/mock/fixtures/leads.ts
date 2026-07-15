import type { Lead } from "@/lib/salesforce/types";
import { daysAgo } from "@/lib/salesforce/mock/fixtures/dates";

export const LEADS: Lead[] = [
  {
    id: "00Q-ACME-1",
    name: "Jordan Smith",
    title: "Marketing Coordinator",
    ownerId: "u-alex",
    ownerName: "Alex Rivera",
    status: "Open - Not Contacted",
    accountId: "0015Y00000ACME01",
    lastActivityDate: daysAgo(40),
  },
  {
    id: "00Q-STRK-1",
    name: "Avery Stone",
    title: "Procurement Specialist",
    ownerId: "u-alex",
    ownerName: "Alex Rivera",
    status: "Working",
    accountId: "0015Y00000STRK01",
    lastActivityDate: daysAgo(35),
  },
];
