import type { Account, AccountBundle, AccountListItem, AccountSearchMatch, Contact } from "@/lib/salesforce/types";
import type { SdrLead, SdrLeadListItem } from "@/lib/leads/types";
import type { DuplicateMatch } from "@/lib/workability/duplicate";
import type { OutreachPush } from "@/lib/outreach";
import { MockSalesforceProvider } from "@/lib/salesforce/mock/mock-provider";
import { GlobalSalesforceProvider } from "@/lib/salesforce/global-provider";

export type SearchType =
  | "domain"
  | "global_account_id"
  | "account_name"
  | "lead_id"
  | "email"
  | "lead_name";

export type SearchOutcome =
  | { matchType: "single"; account: AccountSearchMatch }
  | { matchType: "multiple"; matches: AccountSearchMatch[] }
  | { matchType: "none" };

/** Lightweight lead match for the SDR "Analyze Lead" search + disambiguation. */
export interface LeadSearchMatch {
  id: string;
  name: string;
  title: string;
  accountName: string | null;
  domain: string | null;
  email: string | null;
}

export type LeadSearchOutcome =
  | { matchType: "single"; lead: LeadSearchMatch }
  | { matchType: "multiple"; matches: LeadSearchMatch[] }
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
  /** Resolve a lead by Lead ID, work email, or name (SDR "Analyze Lead"). */
  searchLeads(query: string): Promise<LeadSearchOutcome>;
  getAccountBundle(accountId: string): Promise<AccountBundle | null>;
  assignToMe(accountId: string, userId: string, userName: string): Promise<Account>;
  updateAbmStatus(accountId: string, abmNurtureStatus: string | null): Promise<Account>;
  listAccounts(): Promise<AccountListItem[]>;
  /** Other accounts that look like duplicates of this one (domain/parent/location/name). */
  findDuplicateAccounts(accountId: string): Promise<DuplicateMatch[]>;
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

// Salesforce Lead ids start 00Q; used to route a lead search by id vs. email vs.
// name so the audit log records what the SDR searched by.
const LEAD_ID_PATTERN = /^00Q[a-zA-Z0-9]{12,15}$/;

export function detectLeadSearchType(query: string): SearchType {
  const trimmed = query.trim();
  if (trimmed.includes("@")) {
    return "email";
  }
  if (LEAD_ID_PATTERN.test(trimmed)) {
    return "lead_id";
  }
  return "lead_name";
}

// Re-exported from the DB-free urls module so server callers can keep importing
// these from the provider, while client components import from lib/salesforce/urls.
export { buildSalesforceAccountUrl, buildSalesforceLeadUrl } from "@/lib/salesforce/urls";

export function getSalesforceProvider(): SalesforceProvider {
  const providerName = process.env.SALESFORCE_PROVIDER ?? "mock";

  switch (providerName) {
    case "mock":
      return new MockSalesforceProvider();
    case "global-sf":
      return new GlobalSalesforceProvider();
    default:
      throw new Error(
        `Unknown SALESFORCE_PROVIDER "${providerName}". Use "mock" or "global-sf".`,
      );
  }
}
