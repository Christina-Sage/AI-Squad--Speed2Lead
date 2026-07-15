import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import type { SearchType } from "@/lib/salesforce/provider";
import type { Team } from "@/lib/teams";

export interface AuditLogEntry {
  userId: string;
  userName: string;
  team: Team;
  searchInput: string;
  searchType: SearchType;
  accountId?: string | null;
  domain?: string | null;
  accountName?: string | null;
  finalStatus?: string | null;
  reason?: string | null;
  reasonCodes?: string[] | null;
  action: "SEARCH" | "ASSIGN_TO_ME" | "ASSIGN_OWNER" | "ADD_CONTACT" | "APPLY_HYGIENE" | "PUSH_OUTREACH";
  assignmentDetails?: Record<string, unknown> | null;
}

export async function writeAuditLog(entry: AuditLogEntry) {
  await db.insert(auditLog).values({
    userId: entry.userId,
    userName: entry.userName,
    team: entry.team,
    searchInput: entry.searchInput,
    searchType: entry.searchType,
    accountId: entry.accountId ?? null,
    domain: entry.domain ?? null,
    accountName: entry.accountName ?? null,
    finalStatus: entry.finalStatus ?? null,
    reason: entry.reason ?? null,
    reasonCodes: entry.reasonCodes ?? null,
    action: entry.action,
    assignmentDetails: entry.assignmentDetails ?? null,
  });
}
