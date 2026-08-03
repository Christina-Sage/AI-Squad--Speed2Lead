import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type {
  Account,
  AccountBundle,
  AccountListItem,
  AccountSearchMatch,
  ActivityRecord,
  Contact,
  Lead,
  Opportunity,
} from "@/lib/salesforce/types";
import type { SdrLead, SdrLeadListItem } from "@/lib/leads/types";
import type {
  LeadSearchMatch,
  LeadSearchOutcome,
  NewContactInput,
  SalesforceProvider,
  SearchOutcome,
  WorkItState,
} from "@/lib/salesforce/provider";
import type { OutreachPush } from "@/lib/outreach";
import { findDuplicates, type DuplicateMatch } from "@/lib/workability/duplicate";
import { detectSearchType, detectLeadSearchType } from "@/lib/salesforce/provider";

// SDR lead ids use the Salesforce Lead prefix (00Q). Lead-scoped work-it (a lead
// with no linked account) reuses the account work-it mutations keyed by the lead
// id, so those methods accept a lead id as well as a real account id.
function isLeadId(id: string): boolean {
  return id.startsWith("00Q");
}

// Convex stores the narrow string-union fields (Product, AccountType,
// ActivityType, …) as plain strings so the schema never rejects a new value
// before its TS union is updated. These casts re-narrow at the read boundary —
// the values were written from typed fixtures, so they are sound.
function toAccount(doc: Awaited<ReturnType<typeof fetchAccountById>>): Account {
  return doc as unknown as Account;
}

function toMatch(account: Account): AccountSearchMatch {
  return {
    id: account.id,
    name: account.name,
    domain: account.domain,
    ownerId: account.ownerId,
    ownerName: account.ownerName,
  };
}

// Small typed helper so `toAccount` can name the query's return shape.
function fetchAccountById(id: string) {
  return fetchQuery(api.accounts.getById, { id });
}

export class ConvexSalesforceProvider implements SalesforceProvider {
  async search(query: string): Promise<SearchOutcome> {
    const trimmed = query.trim();
    const searchType = detectSearchType(trimmed);
    const all = (await fetchQuery(api.accounts.list, {})) as unknown as Account[];

    let matches: Account[] = [];
    if (searchType === "global_account_id") {
      matches = all.filter((a) => a.id === trimmed);
    } else if (searchType === "domain") {
      matches = all.filter((a) => a.domain.toLowerCase() === trimmed.toLowerCase());
    } else {
      const needle = trimmed.toLowerCase();
      matches = all.filter((a) => a.name.toLowerCase().includes(needle));
    }

    if (matches.length === 0) return { matchType: "none" };
    if (matches.length === 1) return { matchType: "single", account: toMatch(matches[0]) };
    return { matchType: "multiple", matches: matches.map(toMatch) };
  }

  async searchLeads(query: string): Promise<LeadSearchOutcome> {
    const trimmed = query.trim();
    if (!trimmed) return { matchType: "none" };

    const all = await this.listSdrLeads();
    const type = detectLeadSearchType(trimmed);
    const needle = trimmed.toLowerCase();

    let matches: SdrLeadListItem[];
    if (type === "lead_id") {
      matches = all.filter((l) => l.id.toLowerCase() === needle);
    } else if (type === "email") {
      matches = all.filter((l) => (l.email ?? "").toLowerCase() === needle);
    } else {
      matches = all.filter(
        (l) =>
          l.name.toLowerCase().includes(needle) ||
          (l.accountName ?? "").toLowerCase().includes(needle),
      );
    }

    if (matches.length === 0) return { matchType: "none" };

    const toLeadMatch = (l: SdrLeadListItem): LeadSearchMatch => ({
      id: l.id,
      name: l.name,
      title: l.title,
      accountName: l.accountName,
      domain: l.domain,
      email: l.email,
    });

    if (matches.length === 1) return { matchType: "single", lead: toLeadMatch(matches[0]) };
    return { matchType: "multiple", matches: matches.map(toLeadMatch) };
  }

  async getAccountBundle(accountId: string): Promise<AccountBundle | null> {
    const stored = await fetchAccountById(accountId);
    if (!stored) return null;
    const account = toAccount(stored);
    const product = account.product;

    const [leads, contacts, opportunities, activities] = await Promise.all([
      fetchQuery(api.salesforceLeads.byAccount, { accountId }),
      fetchQuery(api.contacts.byAccount, { accountId }),
      fetchQuery(api.opportunities.byAccount, { accountId }),
      fetchQuery(api.activities.byAccount, { accountId }),
    ]);

    return {
      account,
      leads: (leads as unknown as Lead[]).map((l) => ({ ...l, product })),
      contacts: (contacts as unknown as Contact[]).map((c) => ({ ...c, product })),
      opportunities: (opportunities as unknown as Opportunity[]).map((o) => ({ ...o, product })),
      activities: activities as unknown as ActivityRecord[],
    };
  }

  async assignToMe(accountId: string, userId: string, userName: string): Promise<Account> {
    const updated = await fetchMutation(api.accounts.assign, {
      id: accountId,
      ownerId: userId,
      ownerName: userName,
      abmNurtureStatus: "Working",
    });
    return updated as unknown as Account;
  }

  async updateAbmStatus(accountId: string, abmNurtureStatus: string | null): Promise<Account> {
    const updated = await fetchMutation(api.accounts.setAbmStatus, {
      id: accountId,
      abmNurtureStatus,
    });
    return updated as unknown as Account;
  }

  async listAccounts(): Promise<AccountListItem[]> {
    const all = (await fetchQuery(api.accounts.list, {})) as unknown as Account[];
    return all
      // Accounts flagged worklistHidden exist only to back a lead-level checklist
      // state; they stay resolvable by id but never enter the account worklist.
      .filter((account) => !account.worklistHidden)
      .map((account) => ({
        ...toMatch(account),
        type: account.type,
        industry: account.industry,
        product: account.product,
      }));
  }

  async findDuplicateAccounts(accountId: string): Promise<DuplicateMatch[]> {
    const all = (await fetchQuery(api.accounts.list, {})) as unknown as Account[];
    const account = all.find((a) => a.id === accountId);
    if (!account) return [];
    return findDuplicates(account, all);
  }

  async listSdrLeads(): Promise<SdrLeadListItem[]> {
    const [leads, accounts] = await Promise.all([
      fetchQuery(api.sdrLeads.list, {}),
      fetchQuery(api.accounts.list, {}),
    ]);
    const accountsById = new Map(
      (accounts as unknown as Account[]).map((a) => [a.id, a]),
    );

    return (leads as unknown as SdrLead[]).map((lead) => {
      const account = lead.accountId ? accountsById.get(lead.accountId) ?? null : null;
      return {
        id: lead.id,
        name: lead.name,
        title: lead.title,
        accountId: lead.accountId,
        accountName: account?.name ?? lead.company ?? null,
        domain: account?.domain ?? null,
        priorityGroup: lead.priorityGroup,
        product: lead.product,
        score: lead.score,
        fit: lead.fit,
        intent: lead.intent,
        workability: lead.workability,
        email: lead.email ?? null,
        createdAt: lead.createdAt ?? null,
      };
    });
  }

  async getSdrLead(leadId: string): Promise<SdrLead | null> {
    const lead = await fetchQuery(api.sdrLeads.getById, { id: leadId });
    return (lead as unknown as SdrLead | null) ?? null;
  }

  async getSdrLeadBundle(
    leadId: string,
  ): Promise<{ lead: SdrLead; accountBundle: AccountBundle | null } | null> {
    const lead = await this.getSdrLead(leadId);
    if (!lead) return null;
    const accountBundle = lead.accountId ? await this.getAccountBundle(lead.accountId) : null;
    return { lead, accountBundle };
  }

  async addContact(
    accountId: string,
    input: NewContactInput,
    ownerId: string,
    ownerName: string,
  ): Promise<Contact> {
    if (!isLeadId(accountId)) {
      const account = await fetchAccountById(accountId);
      if (!account) throw new Error(`Account ${accountId} not found`);
    }

    const contact = await fetchMutation(api.contacts.insert, {
      id: `003-NEW-${Date.now().toString(36)}`,
      name: input.name,
      title: input.title,
      ownerId,
      ownerName,
      accountId,
    });
    return contact as unknown as Contact;
  }

  async applyHygieneField(accountId: string, field: string): Promise<void> {
    await this.assertResolvable(accountId);
    await fetchMutation(api.workItState.applyHygiene, { accountId, field });
  }

  async pushToOutreach(accountId: string, push: OutreachPush): Promise<void> {
    await this.assertResolvable(accountId);
    await fetchMutation(api.workItState.setOutreach, { accountId, push });
  }

  async getWorkItState(accountId: string): Promise<WorkItState> {
    const [state, contacts] = await Promise.all([
      fetchQuery(api.workItState.get, { accountId }),
      fetchQuery(api.contacts.byAccount, { accountId }),
    ]);
    const addedContactNames = (contacts as unknown as (Contact & { researchAdded?: boolean })[])
      .filter((c) => c.researchAdded)
      .map((c) => c.name.trim().toLowerCase());
    return {
      addedContactNames,
      appliedHygieneFields: state.appliedHygieneFields,
      outreachPush: state.outreachPush,
    };
  }

  // Work-it actions accept a real account id or an SDR lead id (00Q…). Confirm
  // the account exists for the account case; lead-scoped state has no account.
  private async assertResolvable(accountId: string): Promise<void> {
    if (isLeadId(accountId)) return;
    const account = await fetchAccountById(accountId);
    if (!account) throw new Error(`Account ${accountId} not found`);
  }
}
