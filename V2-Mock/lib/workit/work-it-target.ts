import type { SalesforceProvider } from "@/lib/salesforce/provider";
import { companyDomainFromEmail } from "@/lib/leads/email-domains";

/** Display fields for the audit log when a work-it action runs. */
export interface WorkItTarget {
  domain: string;
  name: string;
}

/**
 * Resolves the work-it target for an id that may be either a Salesforce account
 * or an SDR lead. Lead-scoped work-it (a lead with no linked account) reuses the
 * same action endpoints, keyed by the lead id, so this falls back to the lead's
 * company + email-inferred domain when the id isn't an account.
 */
export async function resolveWorkItTarget(
  provider: SalesforceProvider,
  id: string,
): Promise<WorkItTarget | null> {
  const bundle = await provider.getAccountBundle(id);
  if (bundle) return { domain: bundle.account.domain, name: bundle.account.name };

  const lead = await provider.getSdrLead(id);
  if (lead) {
    return {
      domain: companyDomainFromEmail(lead.email) ?? "",
      name: lead.company ?? lead.name,
    };
  }
  return null;
}
