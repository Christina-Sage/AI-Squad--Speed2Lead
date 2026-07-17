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
