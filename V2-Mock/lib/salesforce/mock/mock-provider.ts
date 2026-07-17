import type { Account, AccountBundle, AccountListItem, AccountSearchMatch, Contact } from "@/lib/salesforce/types";
import type { SdrLead, SdrLeadListItem } from "@/lib/leads/types";
import type { NewContactInput, SalesforceProvider, SearchOutcome, WorkItState } from "@/lib/salesforce/provider";
import type { OutreachPush } from "@/lib/outreach";
import { detectSearchType } from "@/lib/salesforce/provider";
import { getMockStore } from "@/lib/salesforce/mock/store";
import {
  getAllOverrides,
  getOverride,
  setOverride,
  type AccountOverride,
} from "@/lib/salesforce/mock/overrides";

function toMatch(account: Account): AccountSearchMatch {
  return {
    id: account.id,
    name: account.name,
    domain: account.domain,
    ownerId: account.ownerId,
    ownerName: account.ownerName,
  };
}

function applyOverride(account: Account, override: AccountOverride | undefined): Account {
  if (!override) return account;
  return {
    ...account,
    ownerId: override.ownerId,
    ownerName: override.ownerName,
    abmNurtureStatus: override.abmNurtureStatus,
  };
}

export class MockSalesforceProvider implements SalesforceProvider {
  async search(query: string): Promise<SearchOutcome> {
    const store = getMockStore();
    const trimmed = query.trim();
    const searchType = detectSearchType(trimmed);
    const allAccounts = Array.from(store.accounts.values());

    let matches: Account[] = [];

    if (searchType === "global_account_id") {
      const found = store.accounts.get(trimmed);
      matches = found ? [found] : [];
    } else if (searchType === "domain") {
      matches = allAccounts.filter((a) => a.domain.toLowerCase() === trimmed.toLowerCase());
    } else {
      const needle = trimmed.toLowerCase();
      matches = allAccounts.filter((a) => a.name.toLowerCase().includes(needle));
    }

    if (matches.length === 0) return { matchType: "none" };

    const overrides = await getAllOverrides();
    const resolved = matches.map((m) => applyOverride(m, overrides.get(m.id)));

    if (resolved.length === 1) return { matchType: "single", account: toMatch(resolved[0]) };
    return { matchType: "multiple", matches: resolved.map(toMatch) };
  }

  async getAccountBundle(accountId: string): Promise<AccountBundle | null> {
    const store = getMockStore();
    const stored = store.accounts.get(accountId);
    if (!stored) return null;

    const override = await getOverride(accountId);
    const account = applyOverride(stored, override);

    return {
      account,
      leads: store.leads.filter((l) => l.accountId === accountId),
      contacts: store.contacts.filter((c) => c.accountId === accountId),
      opportunities: store.opportunities.filter((o) => o.accountId === accountId),
      activities: store.activities.filter((a) => a.accountId === accountId),
    };
  }

  async assignToMe(accountId: string, userId: string, userName: string): Promise<Account> {
    const store = getMockStore();
    const stored = store.accounts.get(accountId);
    if (!stored) {
      throw new Error(`Account ${accountId} not found`);
    }

    const abmNurtureStatus = "Working";
    stored.ownerId = userId;
    stored.ownerName = userName;
    stored.abmNurtureStatus = abmNurtureStatus;
    store.accounts.set(accountId, stored);

    await setOverride(accountId, { ownerId: userId, ownerName: userName, abmNurtureStatus });

    return stored;
  }

  async updateAbmStatus(accountId: string, abmNurtureStatus: string | null): Promise<Account> {
    const store = getMockStore();
    const stored = store.accounts.get(accountId);
    if (!stored) {
      throw new Error(`Account ${accountId} not found`);
    }

    const override = await getOverride(accountId);
    const current = applyOverride(stored, override);
    current.abmNurtureStatus = abmNurtureStatus;
    store.accounts.set(accountId, current);

    await setOverride(accountId, {
      ownerId: current.ownerId,
      ownerName: current.ownerName,
      abmNurtureStatus,
    });

    return current;
  }

  async listAccounts(): Promise<AccountListItem[]> {
    const store = getMockStore();
    const overrides = await getAllOverrides();
    return Array.from(store.accounts.values()).map((account) => {
      const resolved = applyOverride(account, overrides.get(account.id));
      return {
        ...toMatch(resolved),
        type: resolved.type,
        industry: resolved.industry,
      };
    });
  }

  async listSdrLeads(): Promise<SdrLeadListItem[]> {
    const store = getMockStore();
    return store.sdrLeads.map((lead) => {
      const account = lead.accountId ? store.accounts.get(lead.accountId) ?? null : null;
      return {
        id: lead.id,
        name: lead.name,
        title: lead.title,
        accountId: lead.accountId,
        accountName: account?.name ?? null,
        domain: account?.domain ?? null,
        priorityGroup: lead.priorityGroup,
        score: lead.score,
        fit: lead.fit,
        intent: lead.intent,
        workability: lead.workability,
      };
    });
  }

  async getSdrLead(leadId: string): Promise<SdrLead | null> {
    const store = getMockStore();
    return store.sdrLeads.find((l) => l.id === leadId) ?? null;
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
    const store = getMockStore();
    if (!store.accounts.has(accountId)) {
      throw new Error(`Account ${accountId} not found`);
    }

    const contact: Contact = {
      id: `003-NEW-${Date.now().toString(36)}-${store.contacts.length}`,
      name: input.name,
      title: input.title,
      ownerId,
      ownerName,
      accountId,
      // New research-sourced contact: no activity yet, so it cannot trip ROE.
      lastActivityDate: null,
    };
    store.contacts.push(contact);

    const added = store.addedContactNames.get(accountId) ?? new Set<string>();
    added.add(input.name.trim().toLowerCase());
    store.addedContactNames.set(accountId, added);

    return contact;
  }

  async applyHygieneField(accountId: string, field: string): Promise<void> {
    const store = getMockStore();
    if (!store.accounts.has(accountId)) {
      throw new Error(`Account ${accountId} not found`);
    }
    const applied = store.appliedHygieneFields.get(accountId) ?? new Set<string>();
    applied.add(field);
    store.appliedHygieneFields.set(accountId, applied);
  }

  async pushToOutreach(accountId: string, push: OutreachPush): Promise<void> {
    const store = getMockStore();
    if (!store.accounts.has(accountId)) {
      throw new Error(`Account ${accountId} not found`);
    }
    store.outreachPushes.set(accountId, push);
  }

  async getWorkItState(accountId: string): Promise<WorkItState> {
    const store = getMockStore();
    return {
      addedContactNames: Array.from(store.addedContactNames.get(accountId) ?? []),
      appliedHygieneFields: Array.from(store.appliedHygieneFields.get(accountId) ?? []),
      outreachPush: store.outreachPushes.get(accountId) ?? null,
    };
  }
}
