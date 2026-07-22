import type { Account, AccountBundle, AccountListItem, AccountSearchMatch, Contact } from "@/lib/salesforce/types";
import type { SdrLead, SdrLeadListItem } from "@/lib/leads/types";
import type { NewContactInput, SalesforceProvider, SearchOutcome, WorkItState } from "@/lib/salesforce/provider";
import type { OutreachPush } from "@/lib/outreach";
import { deriveLead, type LeadIntakeInput } from "@/lib/leads/lead-intake";
import { getCapturedLead, insertCapturedLead, listCapturedLeads } from "@/lib/leads/lead-store";
import { findDuplicates, type DuplicateMatch } from "@/lib/workability/duplicate";
import { detectSearchType } from "@/lib/salesforce/provider";
import { getMockStore } from "@/lib/salesforce/mock/store";
import {
  getAllOverrides,
  getOverride,
  setOverride,
  type AccountOverride,
} from "@/lib/salesforce/mock/overrides";

// A captured lead counts as "just arrived" (and gets the New badge) for this
// long after it was created. Fixture leads have no createdAt, so they're never
// flagged.
const NEW_LEAD_WINDOW_MS = 24 * 60 * 60 * 1000;

function isRecentlyCaptured(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= NEW_LEAD_WINDOW_MS;
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

  async findDuplicateAccounts(accountId: string): Promise<DuplicateMatch[]> {
    const store = getMockStore();
    const account = store.accounts.get(accountId);
    if (!account) return [];
    return findDuplicates(account, Array.from(store.accounts.values()));
  }

  async listSdrLeads(): Promise<SdrLeadListItem[]> {
    const store = getMockStore();
    // Fixture worklist leads (in code) plus form-captured leads (persisted in
    // the DB); captured leads are shown first so a freshly created lead is easy
    // to spot in a demo.
    const captured = await listCapturedLeads();
    const leads: SdrLead[] = [...captured, ...store.sdrLeads];
    return leads.map((lead) => {
      const account = lead.accountId ? store.accounts.get(lead.accountId) ?? null : null;
      return {
        id: lead.id,
        name: lead.name,
        title: lead.title,
        accountId: lead.accountId,
        // Form-captured leads have no linked account yet; fall back to the
        // company they entered so the worklist row isn't blank.
        accountName: account?.name ?? lead.company ?? null,
        domain: account?.domain ?? null,
        priorityGroup: lead.priorityGroup,
        score: lead.score,
        fit: lead.fit,
        intent: lead.intent,
        workability: lead.workability,
        isNew: isRecentlyCaptured(lead.createdAt),
      };
    });
  }

  async createLead(input: LeadIntakeInput): Promise<SdrLead> {
    const derived = deriveLead(input);

    const name = `${input.firstName} ${input.lastName}`.trim();
    // Salesforce-style 18-char Lead id (00Q prefix). Uniqueness comes from the
    // creation timestamp plus a short random suffix.
    const rand = Math.floor(Math.random() * 1e6).toString(36).toUpperCase();
    const suffix = `${Date.now().toString(36)}${rand}`.toUpperCase();
    const id = `00Q${suffix}`.padEnd(18, "0").slice(0, 18);

    const lead: SdrLead = {
      id,
      name,
      title: input.jobTitle,
      // Net-new inbound lead: not yet matched to an account (LeanData/matching
      // would link it downstream, which this simulation does not model).
      accountId: null,
      ownerName: "House Account",
      status: "Open - Not Contacted",
      priorityGroup: derived.priorityGroup,
      fit: derived.fit,
      intent: derived.intent,
      workability: derived.workability,
      score: derived.score,
      company: input.company,
      email: input.email,
      source: derived.source,
      createdAt: new Date().toISOString(),
    };

    // Persist so the lead survives instance recycling and appears in the
    // worklist across requests (the in-memory store alone is per-instance).
    await insertCapturedLead(lead);
    return lead;
  }

  async getSdrLead(leadId: string): Promise<SdrLead | null> {
    const store = getMockStore();
    const fixture = store.sdrLeads.find((l) => l.id === leadId);
    if (fixture) return fixture;
    // Not a fixture lead — look it up among the persisted, form-captured leads.
    return getCapturedLead(leadId);
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
