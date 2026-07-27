/**
 * Central credential surface for every external integration.
 *
 * This is the ONE place you wire real APIs on: set the env vars in Vercel
 * (Project → Settings → Environment Variables) and the matching integration
 * flips from mock/fixture data to the live client automatically. Nothing else
 * in the app changes — each seam checks `isConfigured` and falls back to the
 * existing mock when credentials are absent, so the demo keeps working with
 * zero env vars set.
 *
 * "Just an API key" is only literally true for 6sense. The OAuth/JWT providers
 * (Salesforce, ZoomInfo, Outreach, Sales Navigator) each need a small set of
 * credentials — modeled below exactly as each provider issues them.
 *
 * NOTE: the client call bodies (auth exchange, endpoints, field mapping) are
 * written to each provider's PUBLIC API spec and are UNTESTED against live
 * endpoints. Verify against the live docs before flipping a provider on in
 * production:
 *   Salesforce      https://developer.salesforce.com/docs/apis
 *   ZoomInfo        https://docs.zoominfo.com/docs/overview
 *   Outreach        https://developers.outreach.io/api
 *   Sales Navigator https://learn.microsoft.com/en-us/linkedin/sales
 *   6sense          https://developers.6sense.com
 */

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

/** True when every provided name resolves to a non-empty env var. */
function allSet(...names: string[]): boolean {
  return names.every((n) => env(n) !== undefined);
}

export interface SalesforceConfig {
  /** Login host — https://login.salesforce.com (prod) or test.salesforce.com (sandbox). */
  loginUrl: string;
  /** Connected-app consumer key (client_id). */
  clientId: string | undefined;
  /** Connected-app consumer secret (client_secret). */
  clientSecret: string | undefined;
  /** OAuth refresh token for the integration user (refresh-token flow). */
  refreshToken: string | undefined;
  /** REST API version, e.g. "v62.0". */
  apiVersion: string;
}

export interface ZoomInfoConfig {
  /** Enterprise API username. */
  username: string | undefined;
  /** Enterprise API client ID. */
  clientId: string | undefined;
  /** PKI private key (PEM) used to sign the JWT auth exchange. */
  privateKey: string | undefined;
}

export interface OutreachConfig {
  /** OAuth app client ID. */
  clientId: string | undefined;
  /** OAuth app client secret. */
  clientSecret: string | undefined;
  /** Long-lived refresh token (access tokens are ~2h and refreshed on demand). */
  refreshToken: string | undefined;
  /** Mailbox to enroll prospects from (email address of the sending mailbox). */
  mailboxEmail: string | undefined;
}

export interface SalesNavigatorConfig {
  /** LinkedIn Sales Navigator Application Platform OAuth client ID. */
  clientId: string | undefined;
  /** OAuth client secret. */
  clientSecret: string | undefined;
  /** OAuth access token (partner-program issued). */
  accessToken: string | undefined;
}

export interface SixSenseConfig {
  /** 6sense API token — the only provider that really is "just a key". */
  apiToken: string | undefined;
}

export const salesforceConfig: SalesforceConfig = {
  loginUrl: env("SALESFORCE_LOGIN_URL") ?? "https://login.salesforce.com",
  clientId: env("SALESFORCE_CLIENT_ID"),
  clientSecret: env("SALESFORCE_CLIENT_SECRET"),
  refreshToken: env("SALESFORCE_REFRESH_TOKEN"),
  apiVersion: env("SALESFORCE_API_VERSION") ?? "v62.0",
};

export const zoomInfoConfig: ZoomInfoConfig = {
  username: env("ZOOMINFO_USERNAME"),
  clientId: env("ZOOMINFO_CLIENT_ID"),
  privateKey: env("ZOOMINFO_PRIVATE_KEY"),
};

export const outreachConfig: OutreachConfig = {
  clientId: env("OUTREACH_CLIENT_ID"),
  clientSecret: env("OUTREACH_CLIENT_SECRET"),
  refreshToken: env("OUTREACH_REFRESH_TOKEN"),
  mailboxEmail: env("OUTREACH_MAILBOX_EMAIL"),
};

export const salesNavigatorConfig: SalesNavigatorConfig = {
  clientId: env("SALESNAV_CLIENT_ID"),
  clientSecret: env("SALESNAV_CLIENT_SECRET"),
  accessToken: env("SALESNAV_ACCESS_TOKEN"),
};

export const sixSenseConfig: SixSenseConfig = {
  apiToken: env("SIXSENSE_API_TOKEN"),
};

/**
 * The Global Salesforce provider only takes over from the mock when
 * SALESFORCE_PROVIDER=global-sf AND the OAuth credentials are present. This
 * lets you deploy the connected-app credentials and still keep the mock by
 * leaving SALESFORCE_PROVIDER unset.
 */
export function isSalesforceConfigured(): boolean {
  return (
    env("SALESFORCE_PROVIDER") === "global-sf" &&
    allSet("SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET", "SALESFORCE_REFRESH_TOKEN")
  );
}

export function isZoomInfoConfigured(): boolean {
  return allSet("ZOOMINFO_USERNAME", "ZOOMINFO_CLIENT_ID", "ZOOMINFO_PRIVATE_KEY");
}

export function isOutreachConfigured(): boolean {
  return allSet("OUTREACH_CLIENT_ID", "OUTREACH_CLIENT_SECRET", "OUTREACH_REFRESH_TOKEN");
}

export function isSalesNavigatorConfigured(): boolean {
  return allSet("SALESNAV_ACCESS_TOKEN");
}

export function isSixSenseConfigured(): boolean {
  return allSet("SIXSENSE_API_TOKEN");
}

export type IntegrationName =
  | "salesforce"
  | "zoominfo"
  | "outreach"
  | "salesNavigator"
  | "sixSense";

export interface IntegrationStatus {
  name: IntegrationName;
  label: string;
  configured: boolean;
  /** Env vars this integration reads. */
  envVars: string[];
}

/**
 * Machine-readable view of what's live vs. still on the mock. Handy for a
 * settings/status page and for confirming a Vercel deploy picked up the vars.
 */
export function integrationStatus(): IntegrationStatus[] {
  return [
    {
      name: "salesforce",
      label: "Salesforce (Global CRM)",
      configured: isSalesforceConfigured(),
      envVars: [
        "SALESFORCE_PROVIDER=global-sf",
        "SALESFORCE_LOGIN_URL",
        "SALESFORCE_CLIENT_ID",
        "SALESFORCE_CLIENT_SECRET",
        "SALESFORCE_REFRESH_TOKEN",
        "SALESFORCE_API_VERSION",
      ],
    },
    {
      name: "zoominfo",
      label: "ZoomInfo",
      configured: isZoomInfoConfigured(),
      envVars: ["ZOOMINFO_USERNAME", "ZOOMINFO_CLIENT_ID", "ZOOMINFO_PRIVATE_KEY"],
    },
    {
      name: "outreach",
      label: "Outreach",
      configured: isOutreachConfigured(),
      envVars: [
        "OUTREACH_CLIENT_ID",
        "OUTREACH_CLIENT_SECRET",
        "OUTREACH_REFRESH_TOKEN",
        "OUTREACH_MAILBOX_EMAIL",
      ],
    },
    {
      name: "salesNavigator",
      label: "LinkedIn Sales Navigator",
      configured: isSalesNavigatorConfigured(),
      envVars: ["SALESNAV_CLIENT_ID", "SALESNAV_CLIENT_SECRET", "SALESNAV_ACCESS_TOKEN"],
    },
    {
      name: "sixSense",
      label: "6sense",
      configured: isSixSenseConfigured(),
      envVars: ["SIXSENSE_API_TOKEN"],
    },
  ];
}
