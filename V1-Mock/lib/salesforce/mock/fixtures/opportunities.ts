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
];
