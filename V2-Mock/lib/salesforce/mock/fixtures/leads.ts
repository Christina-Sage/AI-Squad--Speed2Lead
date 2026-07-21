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
  {
    // Blocking lead: owned by another rep with activity inside the 30-day ROE
    // window, so Redwood Freight evaluates to NOT WORKABLE via a *lead* (not a
    // contact) conflict.
    id: "00Q-RDWD-1",
    name: "Hank Morales",
    title: "VP Finance",
    ownerId: "u-pat",
    ownerName: "Pat Lee",
    status: "Working",
    accountId: "0015Y00000RDWD01",
    lastActivityDate: daysAgo(10),
  },
  {
    // ROE-safe lead (> 30 days) on a workable account.
    id: "00Q-MERD-1",
    name: "Elise Vane",
    title: "Finance Manager",
    ownerId: "u-alex",
    ownerName: "Alex Rivera",
    status: "Open - Not Contacted",
    accountId: "0015Y00000MERD01",
    lastActivityDate: daysAgo(55),
  },
];
