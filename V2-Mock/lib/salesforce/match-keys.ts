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

/**
 * Fusion account-ID shape check — a Fusion-side sanity signal, not a match key.
 * Confirmed example: "400873098". Fusion IDs start with "400" and are all
 * digits. NOTE: the exact total length is unconfirmed — the confirmed example is
 * 9 digits, an earlier note said 10 — so this accepts "400" + 6-or-more digits.
 * Tighten to a fixed length once confirmed.
 */
export function isFusionAccountId(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^400\d{6,}$/.test(id.trim());
}
