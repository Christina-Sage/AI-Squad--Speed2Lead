import type { Account, ActivityRecord, Contact, Lead, Opportunity } from "@/lib/salesforce/types";
import { ACCOUNTS } from "@/lib/salesforce/mock/fixtures/accounts";
import { LEADS } from "@/lib/salesforce/mock/fixtures/leads";
import { CONTACTS } from "@/lib/salesforce/mock/fixtures/contacts";
import { OPPORTUNITIES } from "@/lib/salesforce/mock/fixtures/opportunities";
import { ACTIVITIES } from "@/lib/salesforce/mock/fixtures/activities";

declare global {
  var __mockSalesforceStore: MockStore | undefined;
}

class MockStore {
  accounts = new Map<string, Account>(ACCOUNTS.map((a) => [a.id, structuredClone(a)]));
  leads: Lead[] = structuredClone(LEADS);
  contacts: Contact[] = structuredClone(CONTACTS);
  opportunities: Opportunity[] = structuredClone(OPPORTUNITIES);
  activities: ActivityRecord[] = structuredClone(ACTIVITIES);
}

export function getMockStore(): MockStore {
  if (!globalThis.__mockSalesforceStore) {
    globalThis.__mockSalesforceStore = new MockStore();
  }
  return globalThis.__mockSalesforceStore;
}
