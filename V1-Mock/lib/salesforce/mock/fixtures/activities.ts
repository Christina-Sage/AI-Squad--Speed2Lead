import type { ActivityRecord } from "@/lib/salesforce/types";
import { daysAgo } from "@/lib/salesforce/mock/fixtures/dates";

export const ACTIVITIES: ActivityRecord[] = [
  { id: "act-acme-1", accountId: "0015Y00000ACME01", type: "Email", date: daysAgo(45), relatedToId: "003-ACME-1" },
  { id: "act-hool-1", accountId: "0015Y00000HOOL01", type: "Call", date: daysAgo(8), relatedToId: "003-HOOL-1" },
  { id: "act-strk-1", accountId: "0015Y00000STRK01", type: "Meeting", date: daysAgo(14), relatedToId: "006-STRK-1" },
  { id: "act-wayn-1", accountId: "0015Y00000WAYN01", type: "Task", date: daysAgo(40), relatedToId: "003-WAYN-1" },
];
