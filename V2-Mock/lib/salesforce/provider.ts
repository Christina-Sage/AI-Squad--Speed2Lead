import type { Account, AccountBundle, AccountListItem, AccountSearchMatch, Contact } from "@/lib/salesforce/types";
import type { SdrLead, SdrLeadListItem } from "@/lib/leads/types";
import type { OutreachPush } from "@/lib/outreach";
import { MockSalesforceProvider } from "@/lib/salesforce/mock/mock-provider";

export type SearchType = "domain" | "global_account_id" | "account_name";

export type SearchOutcome =
  | { matchType: "single"; account: AccountSearchMatch }
  | { matchType: "multiple"; matches: AccountSearchMatch[] }
  | { matchType: "none" };

export interface NewContactInput {
  name: string;
  title: string;
  email?: string;
}

export interface WorkItState {
  addedContactNames: string[];
  appliedHygieneFields: string[];
  outreachPush: OutreachPush | null;
}

export interface SalesforceProvider {
  search(query: string): Promise<SearchOutcome>;
  getAccountBundle(accountId: string): Promise<AccountBundle | null>;
  assignToMe(accountId: string, userId: string, userName: string): Promise<Account>;
  updateAbmStatus(accountId: string, abmNurtureStatus: string | null): Promise<Account>;
  listAccounts(): Promise<AccountListItem[]>;
  /** SDR worklist leads (build-plan step 5). */
  listSdrLeads(): Promise<SdrLeadListItem[]>;
  getSdrLead(leadId: string): Promise<SdrLead | null>;
  /** A lead plus its linked account bundle (null bundle when the lead has no account). */
  getSdrLeadBundle(leadId: string): Promise<{ lead: SdrLead; accountBundle: AccountBundle | null } | null>;
  addContact(accountId: string, input: NewContactInput, ownerId: string, ownerName: string): Promise<Contact>;
  applyHygieneField(accountId: string, field: string): Promise<void>;
  pushToOutreach(accountId: string, push: OutreachPush): Promise<void>;
  getWorkItState(accountId: string): Promise<WorkItState>;
}

const GLOBAL_ACCOUNT_ID_PATTERN = /^[a-zA-Z0-9]{15,18}$/;

export function detectSearchType(query: string): SearchType {
  const trimmed = query.trim();
  if (GLOBAL_ACCOUNT_ID_PATTERN.test(trimmed)) {
    return "global_account_id";
  }
  if (trimmed.includes(".") && !trimmed.includes(" ")) {
    return "domain";
  }
  return "account_name";
}

// Re-exported from the DB-free urls module so server callers can keep importing
// these from the provider, while client components import from lib/salesforce/urls.
export { buildSalesforceAccountUrl, buildSalesforceLeadUrl } from "@/lib/salesforce/urls";

export function getSalesforceProvider(): SalesforceProvider {
  const providerName = process.env.SALESFORCE_PROVIDER ?? "mock";

  switch (providerName) {
    case "mock":
      return new MockSalesforceProvider();
    default:
      throw new Error(
        `Unknown SALESFORCE_PROVIDER "${providerName}". Only "mock" is implemented in v1.`,
      );
  }
}
