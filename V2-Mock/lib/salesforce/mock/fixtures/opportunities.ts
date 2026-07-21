import type { Opportunity } from "@/lib/salesforce/types";
import { daysAgo } from "@/lib/salesforce/mock/fixtures/dates";

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "006-STRK-1",
    name: "Stark Industries - Platform Expansion",
    accountId: "0015Y00000STRK01",
    ownerId: "u-pat",
    ownerName: "Pat Lee",
    stage: "Active",
    isClosed: false,
    createdDate: daysAgo(14),
  },
  {
    id: "006-ABC-1",
    name: "ABC Foundation - Renewal (Closed)",
    accountId: "0015Y00002ABC123",
    ownerId: "u-jamie",
    ownerName: "Jamie Park",
    stage: "Closed Won",
    isClosed: true,
    createdDate: daysAgo(400),
  },
  {
    // Reached Discovery before being disqualified 2 months ago — inside the
    // 6-month cooling-off window, so the account is blocked (~4 months left).
    id: "006-UMBP-1",
    name: "Umbrella Pharma - Intacct Evaluation",
    accountId: "0015Y00000UMBP01",
    ownerId: "u-pat",
    ownerName: "Pat Lee",
    stage: "Closed Lost - Disqualified",
    isClosed: true,
    createdDate: daysAgo(150),
    furthestStage: "Discovery",
    closedDate: daysAgo(60),
  },
  {
    // DQ'd 18 days ago but never reached Discovery — eligible to re-work.
    id: "006-WAYN-1",
    name: "Wayne Enterprises - Intacct Intro",
    accountId: "0015Y00000WAYN01",
    ownerId: "u-jamie",
    ownerName: "Jamie Park",
    stage: "Closed Lost - Disqualified",
    isClosed: true,
    createdDate: daysAgo(45),
    furthestStage: "Prospecting",
    closedDate: daysAgo(18),
  },
  {
    // Historical closed-won (advisory add-on). Closed, so it does not block —
    // gives Meridian an opportunity history without affecting workability.
    id: "006-MERD-1",
    name: "Meridian Capital - Advisory Module (Closed Won)",
    accountId: "0015Y00000MERD01",
    ownerId: "u-alex",
    ownerName: "Alex Rivera",
    stage: "Closed Won",
    isClosed: true,
    createdDate: daysAgo(320),
    furthestStage: "Closed Won",
    closedDate: daysAgo(210),
  },
  {
    // Old closed-lost that never reached Discovery — outside any cooling-off
    // rule, so Nimbus stays workable.
    id: "006-NMBS-1",
    name: "Nimbus Software - Early Eval (Closed Lost)",
    accountId: "0015Y00000NMBS01",
    ownerId: "u-jamie",
    ownerName: "Jamie Park",
    stage: "Closed Lost - No Decision",
    isClosed: true,
    createdDate: daysAgo(500),
    furthestStage: "Prospecting",
    closedDate: daysAgo(430),
  },
];
