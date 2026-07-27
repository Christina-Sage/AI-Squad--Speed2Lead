/**
 * Outreach API client — sequence list + push (create prospect, enroll in
 * sequence).
 *
 * Activates only when `isOutreachConfigured()` is true. Auth is OAuth 2.0:
 * a long-lived refresh token (stored in env) is exchanged for a short-lived
 * (~2h) access token on demand. The API is JSON:API-formatted.
 *
 * Endpoints follow the public spec at https://developers.outreach.io/api and
 * are UNTESTED against the live API. Verify before enabling in production.
 *
 * Token note: this caches the access token in module memory for the life of
 * the serverless instance. The refresh token lives in env; if you rotate
 * refresh tokens on use (Outreach supports this), persist the new one to
 * Postgres instead of relying on env — see BACKEND §10.5.
 */
import { outreachConfig, isOutreachConfigured } from "@/lib/integrations/config";

const TOKEN_URL = "https://api.outreach.io/oauth/token";
const BASE_URL = "https://api.outreach.io/api/v2";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: outreachConfig.clientId,
      client_secret: outreachConfig.clientSecret,
      refresh_token: outreachConfig.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Outreach token refresh failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/vnd.api+json",
  };
}

/**
 * Fetch the live sequence names, replacing the hardcoded `SEQUENCES` list.
 * Returns null when unconfigured so callers keep the local list.
 */
export async function listSequenceNames(): Promise<string[] | null> {
  if (!isOutreachConfigured()) return null;

  const token = await getAccessToken();
  const names: string[] = [];
  let url: string | null = `${BASE_URL}/sequences?page[size]=100`;

  // JSON:API paginates via links.next; walk until exhausted.
  while (url) {
    const res = await fetch(url, { headers: authHeaders(token) });
    if (!res.ok) {
      throw new Error(`Outreach list sequences failed: ${res.status} ${res.statusText}`);
    }
    const page = (await res.json()) as {
      data?: { attributes?: { name?: string } }[];
      links?: { next?: string };
    };
    for (const seq of page.data ?? []) {
      if (seq.attributes?.name) names.push(seq.attributes.name);
    }
    url = page.links?.next ?? null;
  }
  return names;
}

export interface OutreachProspectInput {
  name: string;
  email: string;
}

/** Find an existing prospect by email or create one; returns the prospect id. */
async function findOrCreateProspect(
  token: string,
  input: OutreachProspectInput,
): Promise<number> {
  const found = await fetch(
    `${BASE_URL}/prospects?filter[emails]=${encodeURIComponent(input.email)}`,
    { headers: authHeaders(token) },
  );
  if (found.ok) {
    const data = (await found.json()) as { data?: { id: number }[] };
    if (data.data && data.data.length > 0) return data.data[0].id;
  }

  const [firstName, ...rest] = input.name.split(" ");
  const res = await fetch(`${BASE_URL}/prospects`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      data: {
        type: "prospect",
        attributes: {
          firstName,
          lastName: rest.join(" "),
          emails: [input.email],
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Outreach create prospect failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { data: { id: number } };
  return data.data.id;
}

/** Look up a sequence id by its exact name. */
async function findSequenceId(token: string, name: string): Promise<number | null> {
  const res = await fetch(
    `${BASE_URL}/sequences?filter[name]=${encodeURIComponent(name)}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { data?: { id: number }[] };
  return data.data?.[0]?.id ?? null;
}

/**
 * Real push: find-or-create each prospect, then enroll them in the sequence
 * via a sequenceState. Returns the count enrolled. Throws if unconfigured —
 * callers should gate on `isOutreachConfigured()` and fall back to the mock.
 */
export async function pushProspectsToSequence(
  sequenceName: string,
  prospects: OutreachProspectInput[],
): Promise<{ enrolled: number }> {
  if (!isOutreachConfigured()) {
    throw new Error("Outreach is not configured");
  }
  const token = await getAccessToken();
  const sequenceId = await findSequenceId(token, sequenceName);
  if (sequenceId === null) {
    throw new Error(`Outreach sequence not found: ${sequenceName}`);
  }

  let enrolled = 0;
  for (const p of prospects) {
    const prospectId = await findOrCreateProspect(token, p);
    const res = await fetch(`${BASE_URL}/sequenceStates`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        data: {
          type: "sequenceState",
          relationships: {
            prospect: { data: { type: "prospect", id: prospectId } },
            sequence: { data: { type: "sequence", id: sequenceId } },
          },
        },
      }),
    });
    if (res.ok) enrolled += 1;
  }
  return { enrolled };
}
