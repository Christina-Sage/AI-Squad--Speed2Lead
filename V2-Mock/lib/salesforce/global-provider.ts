/**
 * GlobalSalesforceProvider — the real CRM behind the `SalesforceProvider`
 * interface. Selected by `SALESFORCE_PROVIDER=global-sf` once the connected-app
 * credentials are set (see lib/integrations/config.ts). Until then the factory
 * returns the mock and nothing here runs.
 *
 * Two things are needed to go live, and only one of them is credentials:
 *   1. Credentials — connected-app client id/secret + a refresh token (env).
 *   2. FIELD_MAP    — your org's custom-field API names. The app's Account
 *      carries org-specific fields (product, TAM, rating, buying stage,
 *      campaigns, VAR/Intacct flags) whose API names only exist in your org,
 *      so they can't be hardcoded here. Fill the map below.
 *
 * The OAuth refresh flow and the SOQL/REST helpers are written to the public
 * Salesforce REST API spec (https://developer.salesforce.com/docs/apis) and
 * are UNTESTED against a live org. The account read path is implemented against
 * FIELD_MAP; the SDR-lead and work-it-state methods throw a clear "wire me"
 * error rather than silently returning wrong data — implement them against
 * your org's objects when you reach that phase.
 */
import type {
  Account,
  AccountBundle,
  AccountListItem,
  AccountSearchMatch,
  Contact,
} from "@/lib/salesforce/types";
import type { SdrLead, SdrLeadListItem } from "@/lib/leads/types";
import type { DuplicateMatch } from "@/lib/workability/duplicate";
import type {
  NewContactInput,
  SalesforceProvider,
  SearchOutcome,
  WorkItState,
} from "@/lib/salesforce/provider";
import { detectSearchType } from "@/lib/salesforce/provider";
import { salesforceConfig } from "@/lib/integrations/config";

/**
 * Map the app's fields to your org's Salesforce API names. Standard fields are
 * pre-filled; every `__c` below is a placeholder — replace with your org's
 * actual custom-field API names before enabling global-sf.
 */
const FIELD_MAP = {
  domain: "Website",
  product: "Product__c",
  tam: "TAM_Status__c",
  rating: "Rating",
  buyingStage: "Buying_Stage__c",
  abmNurtureStatus: "ABM_Nurture_Status__c",
  varStatus: "VAR_Status__c",
  existingCustomerFlag: "Existing_Customer__c",
} as const;

const TOKEN_URL_PATH = "/services/oauth2/token";

let cachedToken: { accessToken: string; instanceUrl: string; expiresAt: number } | null = null;

async function getAuth(): Promise<{ accessToken: string; instanceUrl: string }> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return { accessToken: cachedToken.accessToken, instanceUrl: cachedToken.instanceUrl };
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: salesforceConfig.clientId ?? "",
    client_secret: salesforceConfig.clientSecret ?? "",
    refresh_token: salesforceConfig.refreshToken ?? "",
  });
  const res = await fetch(`${salesforceConfig.loginUrl}${TOKEN_URL_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Salesforce token refresh failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { access_token: string; instance_url: string };
  // Salesforce access tokens don't carry expires_in on refresh; assume ~2h.
  cachedToken = {
    accessToken: data.access_token,
    instanceUrl: data.instance_url,
    expiresAt: Date.now() + 2 * 60 * 60_000,
  };
  return { accessToken: data.access_token, instanceUrl: data.instance_url };
}

async function soql<T>(query: string): Promise<T[]> {
  const { accessToken, instanceUrl } = await getAuth();
  const url = `${instanceUrl}/services/data/${salesforceConfig.apiVersion}/query?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    throw new Error(`Salesforce SOQL failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { records: T[] };
  return data.records;
}

async function restPatch(sobject: string, id: string, fields: Record<string, unknown>): Promise<void> {
  const { accessToken, instanceUrl } = await getAuth();
  const url = `${instanceUrl}/services/data/${salesforceConfig.apiVersion}/sobjects/${sobject}/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    throw new Error(`Salesforce update ${sobject} failed: ${res.status} ${res.statusText}`);
  }
}

async function restPost(sobject: string, fields: Record<string, unknown>): Promise<string> {
  const { accessToken, instanceUrl } = await getAuth();
  const url = `${instanceUrl}/services/data/${salesforceConfig.apiVersion}/sobjects/${sobject}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    throw new Error(`Salesforce create ${sobject} failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

interface AccountRow {
  Id: string;
  Name: string;
  OwnerId: string;
  Owner?: { Name?: string };
  Industry?: string;
  Type?: string;
  [key: string]: unknown;
}

function mapAccountRow(row: AccountRow): Account {
  return {
    id: row.Id,
    name: row.Name,
    domain: String(row[FIELD_MAP.domain] ?? ""),
    ownerId: row.OwnerId,
    ownerName: row.Owner?.Name ?? "",
    industry: row.Industry ?? "",
    type: (row.Type as Account["type"]) ?? "Prospect",
    product: (row[FIELD_MAP.product] as Account["product"]) ?? ("Intacct" as Account["product"]),
    tam: (row[FIELD_MAP.tam] as Account["tam"]) ?? null,
    rating: (row[FIELD_MAP.rating] as Account["rating"]) ?? null,
    buyingStage: (row[FIELD_MAP.buyingStage] as Account["buyingStage"]) ?? null,
    abmNurtureStatus: (row[FIELD_MAP.abmNurtureStatus] as string | null) ?? null,
    lastActivityDate: null,
    intacct: {
      hasOpenOpps: false,
      varStatus: (row[FIELD_MAP.varStatus] as string) ?? undefined,
      existingCustomerFlag: Boolean(row[FIELD_MAP.existingCustomerFlag]),
    },
  };
}

function notWired(method: string): never {
  throw new Error(
    `GlobalSalesforceProvider.${method}() is not wired yet. Implement it against ` +
      `your org's objects, or keep SALESFORCE_PROVIDER=mock for this capability.`,
  );
}

export class GlobalSalesforceProvider implements SalesforceProvider {
  async search(query: string): Promise<SearchOutcome> {
    const type = detectSearchType(query);
    const q = query.trim().replace(/'/g, "\\'");
    const cols = `Id, Name, ${FIELD_MAP.domain}, OwnerId, Owner.Name`;
    const where =
      type === "global_account_id"
        ? `Id = '${q}'`
        : type === "domain"
          ? `${FIELD_MAP.domain} = '${q}'`
          : `Name LIKE '%${q}%'`;
    const rows = await soql<AccountRow>(`SELECT ${cols} FROM Account WHERE ${where} LIMIT 25`);
    const matches: AccountSearchMatch[] = rows.map((r) => ({
      id: r.Id,
      name: r.Name,
      domain: String(r[FIELD_MAP.domain] ?? ""),
      ownerId: r.OwnerId,
      ownerName: r.Owner?.Name ?? "",
    }));
    if (matches.length === 0) return { matchType: "none" };
    if (matches.length === 1) return { matchType: "single", account: matches[0] };
    return { matchType: "multiple", matches };
  }

  async getAccountBundle(accountId: string): Promise<AccountBundle | null> {
    const id = accountId.replace(/'/g, "\\'");
    const cols = [
      "Id",
      "Name",
      "OwnerId",
      "Owner.Name",
      "Industry",
      "Type",
      ...Object.values(FIELD_MAP),
    ].join(", ");
    const rows = await soql<AccountRow>(`SELECT ${cols} FROM Account WHERE Id = '${id}' LIMIT 1`);
    if (rows.length === 0) return null;
    // Leads/contacts/opps/activities are separate SOQL queries — wire them the
    // same way against your org's objects when building out the full bundle.
    return {
      account: mapAccountRow(rows[0]),
      leads: [],
      contacts: [],
      opportunities: [],
      activities: [],
    };
  }

  async assignToMe(accountId: string, userId: string): Promise<Account> {
    await restPatch("Account", accountId, { OwnerId: userId });
    const bundle = await this.getAccountBundle(accountId);
    if (!bundle) throw new Error(`Account ${accountId} not found after assign`);
    return bundle.account;
  }

  async updateAbmStatus(accountId: string, abmNurtureStatus: string | null): Promise<Account> {
    await restPatch("Account", accountId, { [FIELD_MAP.abmNurtureStatus]: abmNurtureStatus });
    const bundle = await this.getAccountBundle(accountId);
    if (!bundle) throw new Error(`Account ${accountId} not found after ABM update`);
    return bundle.account;
  }

  async listAccounts(): Promise<AccountListItem[]> {
    const cols = `Id, Name, ${FIELD_MAP.domain}, OwnerId, Owner.Name, Type, Industry, ${FIELD_MAP.product}`;
    const rows = await soql<AccountRow>(`SELECT ${cols} FROM Account ORDER BY LastModifiedDate DESC LIMIT 200`);
    return rows.map((r) => ({
      id: r.Id,
      name: r.Name,
      domain: String(r[FIELD_MAP.domain] ?? ""),
      ownerId: r.OwnerId,
      ownerName: r.Owner?.Name ?? "",
      type: (r.Type as AccountListItem["type"]) ?? "Prospect",
      industry: r.Industry ?? "",
      product: (r[FIELD_MAP.product] as AccountListItem["product"]) ?? ("Intacct" as AccountListItem["product"]),
    }));
  }

  async addContact(
    accountId: string,
    input: NewContactInput,
    ownerId: string,
    ownerName: string,
  ): Promise<Contact> {
    const [firstName, ...rest] = input.name.split(" ");
    const id = await restPost("Contact", {
      AccountId: accountId,
      FirstName: firstName,
      LastName: rest.join(" ") || firstName,
      Title: input.title,
      Email: input.email,
    });
    return {
      id,
      name: input.name,
      title: input.title,
      ownerId,
      ownerName,
      accountId,
      lastActivityDate: null,
    };
  }

  // --- App-local / phase-2 capabilities: wire against your org when you reach them. ---
  async findDuplicateAccounts(): Promise<DuplicateMatch[]> {
    notWired("findDuplicateAccounts");
  }
  async listSdrLeads(): Promise<SdrLeadListItem[]> {
    notWired("listSdrLeads");
  }
  async getSdrLead(): Promise<SdrLead | null> {
    notWired("getSdrLead");
  }
  async getSdrLeadBundle(): Promise<{ lead: SdrLead; accountBundle: AccountBundle | null } | null> {
    notWired("getSdrLeadBundle");
  }
  async applyHygieneField(): Promise<void> {
    notWired("applyHygieneField");
  }
  async pushToOutreach(): Promise<void> {
    // Outreach is its own integration (lib/integrations/outreach.ts); the
    // /api/outreach route calls it directly. Nothing to write in SF here.
    notWired("pushToOutreach");
  }
  async getWorkItState(): Promise<WorkItState> {
    notWired("getWorkItState");
  }
}
