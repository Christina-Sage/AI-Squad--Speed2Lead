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

  // DQ cooling-off opps for the expanded BDR demo accounts: each reached
  // Discovery (or later) before being disqualified and closed inside the
  // 6-month cooling-off window, so the linked account is NOT WORKABLE and lands
  // in "Blocked by de-dupe".
  {
    // Reached Demo, DQ'd ~2.5 months ago — ~3 months of cooling-off remain.
    id: "006-NGMF-1",
    name: "Northgate - Intacct Manufacturing Eval",
    accountId: "0015Y00000NGMF01",
    ownerId: "u-pat",
    ownerName: "Pat Lee",
    stage: "Closed Lost - Disqualified",
    isClosed: true,
    createdDate: daysAgo(210),
    furthestStage: "Demo",
    closedDate: daysAgo(75),
  },
  {
    // Reached Evaluation, DQ'd ~1.5 months ago — most of the window remains.
    id: "006-BWMS-1",
    name: "Bluewater - Intacct Distribution",
    accountId: "0015Y00000BWMS01",
    ownerId: "u-jamie",
    ownerName: "Jamie Park",
    stage: "Closed Lost - Disqualified",
    isClosed: true,
    createdDate: daysAgo(160),
    furthestStage: "Evaluation",
    closedDate: daysAgo(45),
  },
  {
    // Reached Discovery, DQ'd ~4 months ago — ~2 months of cooling-off remain.
    id: "006-HZTG-1",
    name: "Horizon - Intacct Financials",
    accountId: "0015Y00000HZTG01",
    ownerId: "u-alex",
    ownerName: "Alex Rivera",
    stage: "Closed Lost - Disqualified",
    isClosed: true,
    createdDate: daysAgo(300),
    furthestStage: "Discovery",
    closedDate: daysAgo(120),
  },
  {
    // Reached Proposal, DQ'd ~1 month ago — nearly the full window remains.
    id: "006-KYFN-1",
    name: "Keystone - Intacct Nonprofit",
    accountId: "0015Y00000KYFN01",
    ownerId: "u-pat",
    ownerName: "Pat Lee",
    stage: "Closed Lost - Disqualified",
    isClosed: true,
    createdDate: daysAgo(180),
    furthestStage: "Proposal",
    closedDate: daysAgo(30),
  },
];
