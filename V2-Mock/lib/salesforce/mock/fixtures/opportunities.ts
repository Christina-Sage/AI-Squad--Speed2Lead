import type { Opportunity } from "@/lib/salesforce/types";
import { daysAgo } from "@/lib/salesforce/mock/fixtures/dates";
import { DEMO_OPPORTUNITIES } from "@/lib/salesforce/mock/fixtures/demo-accounts";

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
    // Reached Discovery before being disqualified, closed 60 days ago — past the
    // 30-day cooling-off, so the account is clear to re-work.
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
    // Reached Discovery, DQ'd and closed 15 days ago — inside the 30-day
    // cooling-off, so Halcyon Robotics flags for review.
    id: "006-HLCN-1",
    name: "Halcyon Robotics - Intacct Evaluation",
    accountId: "0015Y00000HLCN01",
    ownerId: "u-pat",
    ownerName: "Pat Lee",
    stage: "Closed Lost - Disqualified",
    isClosed: true,
    createdDate: daysAgo(75),
    furthestStage: "Evaluation",
    closedDate: daysAgo(15),
  },
  {
    // Reached Discovery, DQ'd but closed 60 days ago — past the 30-day
    // cooling-off, so Meadowlark is clear to re-work.
    id: "006-MDWL-1",
    name: "Meadowlark Community Fund - Intacct Evaluation",
    accountId: "0015Y00000MDWL01",
    ownerId: "u-jamie",
    ownerName: "Jamie Park",
    stage: "Closed Lost - Disqualified",
    isClosed: true,
    createdDate: daysAgo(120),
    furthestStage: "Discovery",
    closedDate: daysAgo(60),
  },

  // DQ cooling-off opps for the generated per-product demo accounts.
  ...DEMO_OPPORTUNITIES,
];
