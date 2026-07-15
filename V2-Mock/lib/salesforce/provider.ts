import type { Account, AccountBundle, AccountListItem, AccountSearchMatch, Contact } from "@/lib/salesforce/types";
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

const DEFAULT_INSTANCE_URL = "https://yourcompany.lightning.force.com";

export function buildSalesforceAccountUrl(accountId: string): string {
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL ?? DEFAULT_INSTANCE_URL;
  return `${instanceUrl.replace(/\/$/, "")}/lightning/r/Account/${accountId}/view`;
}

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
