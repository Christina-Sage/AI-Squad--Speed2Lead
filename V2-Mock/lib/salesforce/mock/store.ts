import type { Account, ActivityRecord, Contact, Lead, Opportunity } from "@/lib/salesforce/types";
import type { SdrLead } from "@/lib/leads/types";
import type { OutreachPush } from "@/lib/outreach";
import { ACCOUNTS } from "@/lib/salesforce/mock/fixtures/accounts";
import { LEADS } from "@/lib/salesforce/mock/fixtures/leads";
import { SDR_LEADS } from "@/lib/salesforce/mock/fixtures/sdr-leads";
import { CONTACTS } from "@/lib/salesforce/mock/fixtures/contacts";
import { OPPORTUNITIES } from "@/lib/salesforce/mock/fixtures/opportunities";
import { ACTIVITIES } from "@/lib/salesforce/mock/fixtures/activities";

declare global {
  var __mockSalesforceStore: MockStore | undefined;
}

class MockStore {
  accounts = new Map<string, Account>(ACCOUNTS.map((a) => [a.id, structuredClone(a)]));
  leads: Lead[] = structuredClone(LEADS);
  // SDR worklist leads (build-plan step 5). Kept separate from `leads` so they do
  // not affect account-level ROE evaluation.
  sdrLeads: SdrLead[] = structuredClone(SDR_LEADS);
  contacts: Contact[] = structuredClone(CONTACTS);
  opportunities: Opportunity[] = structuredClone(OPPORTUNITIES);
  activities: ActivityRecord[] = structuredClone(ACTIVITIES);

  // Work-it state (v2). In-memory only, like the rest of the mock fixtures:
  // researched contacts added to SFDC, applied hygiene fields, Outreach pushes.
  addedContactNames = new Map<string, Set<string>>(); // accountId -> normalized contact names
  appliedHygieneFields = new Map<string, Set<string>>(); // accountId -> field labels
  outreachPushes = new Map<string, OutreachPush>(); // accountId -> latest push
}

export function getMockStore(): MockStore {
  if (!globalThis.__mockSalesforceStore) {
    globalThis.__mockSalesforceStore = new MockStore();
  }
  return globalThis.__mockSalesforceStore;
}
