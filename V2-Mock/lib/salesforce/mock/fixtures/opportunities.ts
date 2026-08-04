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
    createdBy: "Robin Shah",
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
    movedToDiscoveryDate: daysAgo(135),
    closedDate: daysAgo(60),
    disqualification: {
      reason: "No budget approved for the current fiscal year",
      qualificationNotes: "GxP-compliant reporting need confirmed; multi-entity consolidation across research entities.",
      problems: "SAP incumbent with a recent renewal; finance team stretched, no bandwidth to switch.",
      nextSteps: "Re-engage after their fiscal-year budget reset (Q1).",
    },
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
    disqualification: {
      reason: "Never connected with an economic buyer",
      qualificationNotes: "Inbound from a webinar; foundation arm consolidating 12 entities in spreadsheets.",
      problems: "Only reached an analyst; no CFO/controller engagement, timing unclear.",
      nextSteps: "New CFO appointed since — worth a fresh intro to the finance lead.",
    },
  },
  {
    // Reached Discovery, DQ'd and closed 15 days ago — inside the 30-day
    // cooling-off, so Halcyon Robotics flags for review. Sourced by an inbound
    // (SDR) XDR who has since left the team, so the Inbound team retains ROE for
    // the rest of the window (the manager's Giulia/Inbound example).
    id: "006-HLCN-1",
    name: "Halcyon Robotics - Intacct Evaluation",
    accountId: "0015Y00000HLCN01",
    ownerId: "u-pat",
    ownerName: "Pat Lee",
    createdBy: "Giulia Rossi",
    sourcedByTeam: "SDR",
    sourcedRepActive: false,
    stage: "Closed Lost - Disqualified",
    isClosed: true,
    createdDate: daysAgo(75),
    furthestStage: "Evaluation",
    movedToDiscoveryDate: daysAgo(65),
    closedDate: daysAgo(15),
    disqualification: {
      reason: "Chose to extend their NetSuite trial instead",
      qualificationNotes: "Post-Series D; VP Finance driving first real ERP; ASC 606 SaaS rev-rec requirement.",
      problems: "Competitive NetSuite trial already in flight; price sensitivity flagged.",
      nextSteps: "Check back after the trial lapses (~90 days); lead with SaaS rev-rec depth.",
    },
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
    movedToDiscoveryDate: daysAgo(110),
    closedDate: daysAgo(60),
    disqualification: {
      reason: "Deprioritized after a leadership change",
      qualificationNotes: "Nonprofit fund accounting; grant tracking pain confirmed in discovery.",
      problems: "Executive sponsor left mid-cycle; initiative shelved.",
      nextSteps: "Confirm new finance leadership, then re-open with the grant-tracking use case.",
    },
  },

  {
    // Open (active) deal on Novatek Logistics, created 20 days ago. Recent, so a
    // BDR view hard-blocks it as an active deal while an SDR view reviews it.
    // Surfaces the Opportunity Owner (Pat Lee) and Age on the Open Opportunity check.
    id: "006-NVTK-1",
    name: "Novatek Logistics - Intacct Platform",
    accountId: "0015Y00000NVTK01",
    ownerId: "u-pat",
    ownerName: "Pat Lee",
    createdBy: "Robin Shah",
    stage: "Discovery",
    isClosed: false,
    createdDate: daysAgo(20),
  },
  {
    // Open but STALE deal on Solstice Foundation, created ~14 months ago. Past
    // the 12-month stale window, so a BDR view downgrades it to review (DQ &
    // re-engage) rather than blocking. Surfaces the Opportunity Owner (Jamie
    // Park) and Age on the Open Opportunity check.
    id: "006-SLST-1",
    name: "Solstice Foundation - Intacct Fund Accounting",
    accountId: "0015Y00000SLST01",
    ownerId: "u-jamie",
    ownerName: "Jamie Park",
    createdBy: "Alex Rivera",
    stage: "Negotiation",
    isClosed: false,
    createdDate: daysAgo(430),
  },

  {
    // Prior inbound (SDR) XDR-sourced SQO on the Canadian account Maplechain
    // Logistics, credited 40 days ago — inside the 180-day window. Drives the
    // Canada SQO rule: blocks an outbound (BDR) SQO, reviews an inbound (SDR) one.
    // Closed Won and past its own DQ/open-opp checks, so the Canada SQO rule is
    // the sole flag on the account.
    id: "006-MPLC-1",
    name: "Maplechain Logistics - Intacct SQO",
    accountId: "0015Y00000MPLC01",
    ownerId: "u-pat",
    ownerName: "Pat Lee",
    createdBy: "Giulia Rossi",
    sourcedByTeam: "SDR",
    sqoDate: daysAgo(40),
    stage: "Closed Won",
    isClosed: true,
    createdDate: daysAgo(70),
  },

  // DQ cooling-off opps for the generated per-product demo accounts.
  ...DEMO_OPPORTUNITIES,
];
