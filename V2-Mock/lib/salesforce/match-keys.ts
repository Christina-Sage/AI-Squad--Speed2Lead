/**
 * Cross-instance match keys.
 *
 * GMO SF, Intacct SF, and Fusion do not share account IDs, so records are matched
 * across instances on business attributes. The primary key is a normalized
 * domain; the confirmed rule is: take the email address, keep the part after the
 * `@`, lowercase it. Website is the secondary source when no email exists.
 *
 * These helpers produce the values the resolver writes into `accountResolution`
 * (`domain` / `entityKey`). They intentionally do the minimum normalization we
 * agreed on — extend deliberately, since over-normalizing (e.g. collapsing
 * subdomains) changes who matches whom.
 */

/** Normalize an email into its match domain: the part after `@`, lowercased. */
export function normalizeEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/\.+$/, ""); // drop any trailing dot(s)
  return domain === "" ? null : domain;
}

/**
 * Normalize a domain from an email OR a website URL. Emails use the post-`@`
 * rule; websites are reduced to a bare host (protocol, path, and a leading
 * `www.` stripped). Returns null when nothing usable remains.
 */
export function normalizeDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.includes("@")) return normalizeEmailDomain(trimmed);

  const host = trimmed
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "") // strip scheme (http://, https://, …)
    .replace(/[/?#].*$/, "") // strip path / query / fragment
    .replace(/^www\./, "")
    .replace(/\.+$/, "");
  return host === "" ? null : host;
}

// Common company-name suffixes stripped before comparison so "Acme" and
// "Acme Corp" collapse to the same token. Intentionally small — aggressive
// stripping creates false matches.
const COMPANY_SUFFIXES = new Set([
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "co",
  "company",
  "llc",
  "llp",
  "ltd",
  "limited",
  "plc",
  "gmbh",
  "sa",
  "ag",
]);

/**
 * Normalize a company name into a comparison token: lowercased, punctuation
 * removed, whitespace collapsed, and a trailing legal suffix dropped. Used for
 * the `company + address` fallback match. Returns null when nothing remains.
 */
export function normalizeCompanyName(name: string | null | undefined): string | null {
  if (!name) return null;
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 1 && COMPANY_SUFFIXES.has(words[words.length - 1])) {
    words.pop();
  }
  const token = words.join(" ").trim();
  return token === "" ? null : token;
}

/** Normalize a free-text address line into a comparison token. */
export function normalizeAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const token = address
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return token === "" ? null : token;
}

/**
 * Fusion account-ID shape check — a Fusion-side sanity signal, not a match key.
 * Fusion IDs are exactly 10 digits: the prefix "400" followed by 7 more digits
 * (e.g. "4008730981").
 */
export function isFusionAccountId(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^400\d{7}$/.test(id.trim());
}
