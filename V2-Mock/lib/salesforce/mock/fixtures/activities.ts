import type { ActivityRecord } from "@/lib/salesforce/types";
import { daysAgo } from "@/lib/salesforce/mock/fixtures/dates";

export const ACTIVITIES: ActivityRecord[] = [
  { id: "act-acme-1", accountId: "0015Y00000ACME01", type: "Email", date: daysAgo(45), relatedToId: "003-ACME-1" },
  { id: "act-hool-1", accountId: "0015Y00000HOOL01", type: "Call", date: daysAgo(8), relatedToId: "003-HOOL-1" },
  { id: "act-strk-1", accountId: "0015Y00000STRK01", type: "Meeting", date: daysAgo(14), relatedToId: "006-STRK-1" },
  { id: "act-wayn-1", accountId: "0015Y00000WAYN01", type: "Task", date: daysAgo(40), relatedToId: "003-WAYN-1" },
  { id: "act-merd-1", accountId: "0015Y00000MERD01", type: "Email", date: daysAgo(55), relatedToId: "003-MERD-2" },
  { id: "act-cstl-1", accountId: "0015Y00000CSTL01", type: "Call", date: daysAgo(50), relatedToId: "003-CSTL-2" },
  { id: "act-nmbs-1", accountId: "0015Y00000NMBS01", type: "Meeting", date: daysAgo(48), relatedToId: "003-NMBS-2" },
  { id: "act-vrtx-1", accountId: "0015Y00000VRTX01", type: "Email", date: daysAgo(40), relatedToId: "003-VRTX-1" },
  { id: "act-rdwd-1", accountId: "0015Y00000RDWD01", type: "Call", date: daysAgo(10), relatedToId: "00Q-RDWD-1" },
];
