// Pure Salesforce URL helpers — no DB or provider imports, so these are safe to
// use from client components (the provider module pulls in postgres).
const DEFAULT_INSTANCE_URL = "https://yourcompany.lightning.force.com";

function instanceUrl(): string {
  return (process.env.SALESFORCE_INSTANCE_URL ?? DEFAULT_INSTANCE_URL).replace(/\/$/, "");
}

export function buildSalesforceAccountUrl(accountId: string): string {
  return `${instanceUrl()}/lightning/r/Account/${accountId}/view`;
}

export function buildSalesforceLeadUrl(leadId: string): string {
  return `${instanceUrl()}/lightning/r/Lead/${leadId}/view`;
}

/**
 * Deep link to Salesforce's "New Contact" page, pre-filled with the researched
 * name/title and associated to the account. Lets a rep create the record in
 * Salesforce, then come back and Confirm & add to sync it. Name is split into
 * FirstName / LastName (LastName is required in Salesforce); the whole
 * defaultFieldValues string is URL-encoded as Salesforce expects.
 */
export function buildSalesforceNewContactUrl(
  accountId: string,
  name: string,
  title?: string,
): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const lastName = parts.length > 1 ? parts[parts.length - 1] : name.trim();
  const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
  const fields = [
    firstName ? `FirstName=${firstName}` : null,
    `LastName=${lastName}`,
    title ? `Title=${title}` : null,
    `AccountId=${accountId}`,
  ]
    .filter(Boolean)
    .join(",");
  return `${instanceUrl()}/lightning/o/Contact/new?defaultFieldValues=${encodeURIComponent(fields)}`;
}

/**
 * Deep link to Salesforce's "New Lead" page, pre-filled with the researched
 * name/title (and company, which is required on a Lead). The SDR counterpart to
 * buildSalesforceNewContactUrl: an inbound rep works leads, so a research find
 * on the SDR side is created as a Lead, not an account Contact.
 */
export function buildSalesforceNewLeadUrl(
  name: string,
  title?: string,
  company?: string,
): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const lastName = parts.length > 1 ? parts[parts.length - 1] : name.trim();
  const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
  const fields = [
    firstName ? `FirstName=${firstName}` : null,
    `LastName=${lastName}`,
    title ? `Title=${title}` : null,
    company ? `Company=${company}` : null,
  ]
    .filter(Boolean)
    .join(",");
  return `${instanceUrl()}/lightning/o/Lead/new?defaultFieldValues=${encodeURIComponent(fields)}`;
}
