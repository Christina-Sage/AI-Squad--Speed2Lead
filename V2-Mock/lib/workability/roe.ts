import type { Contact, Lead } from "@/lib/salesforce/types";

export const ROE_WINDOW_DAYS = 30;

export interface RoeViolatingRecord {
  recordType: "Lead" | "Contact";
  id: string;
  name: string;
  owner: string;
  lastActivityDate: string;
  daysSinceActivity: number;
}

export interface RoeResult {
  status: "PASS" | "FAIL";
  violatingRecords: RoeViolatingRecord[];
}

function daysSince(dateString: string, now: Date): number {
  const then = new Date(dateString).getTime();
  const diffMs = now.getTime() - then;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function evaluateRoe(leads: Lead[], contacts: Contact[], now: Date = new Date()): RoeResult {
  const violatingRecords: RoeViolatingRecord[] = [];

  for (const lead of leads) {
    if (!lead.lastActivityDate) continue;
    const days = daysSince(lead.lastActivityDate, now);
    if (days <= ROE_WINDOW_DAYS) {
      violatingRecords.push({
        recordType: "Lead",
        id: lead.id,
        name: lead.name,
        owner: lead.ownerName,
        lastActivityDate: lead.lastActivityDate,
        daysSinceActivity: days,
      });
    }
  }

  for (const contact of contacts) {
    if (!contact.lastActivityDate) continue;
    const days = daysSince(contact.lastActivityDate, now);
    if (days <= ROE_WINDOW_DAYS) {
      violatingRecords.push({
        recordType: "Contact",
        id: contact.id,
        name: contact.name,
        owner: contact.ownerName,
        lastActivityDate: contact.lastActivityDate,
        daysSinceActivity: days,
      });
    }
  }

  return {
    status: violatingRecords.length > 0 ? "FAIL" : "PASS",
    violatingRecords,
  };
}
