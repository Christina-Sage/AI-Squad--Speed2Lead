/**
 * Display IDs shown on the Account / Lead summaries. Deterministic and
 * source-agnostic (the mock has no separate Intacct/Fusion systems), formatted
 * to match the real record IDs:
 *   - Intacct ID  — Salesforce account id, starts "001", 18 chars, alphanumeric
 *   - Lead ID     — Salesforce lead id (Intacct & GMO), starts "00Q", 18 chars
 *   - Fusion ID   — Sage Fusion partner id, starts "400", 10 chars, numeric only
 *
 * Where a real record id already exists (account id, lead id) it's reused and
 * normalized to 18 chars; the Fusion id has no counterpart in the mock, so it's
 * derived. All are stable for a given seed.
 */

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const DIGITS = "0123456789";

/** N deterministic characters from a seed (FNV-1a based), over `alphabet`. */
function chars(seed: string, n: number, alphabet: string = ALNUM): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = "";
  for (let i = 0; i < n; i += 1) {
    out += alphabet[h % alphabet.length];
    h = Math.imul(h ^ (h >>> 13), 16777619) >>> 0;
  }
  return out;
}

/** Take an existing id (or the prefix + seed) to exactly `length` chars. */
function normalize(existing: string, prefix: string, seed: string, length: number): string {
  const base = existing.startsWith(prefix) ? existing : prefix + chars(seed, length);
  return base.length >= length ? base.slice(0, length) : base + chars(base + seed, length - base.length);
}

/** Intacct (Salesforce account) id — "001…", 18 chars. */
export function intacctId(accountId: string): string {
  return normalize(accountId, "001", accountId, 18);
}

/** Lead (Salesforce, Intacct & GMO) id — "00Q…", 18 chars. */
export function leadRecordId(leadId: string): string {
  return normalize(leadId, "00Q", leadId, 18);
}

/**
 * Sage Fusion partner id — "400…", 10 chars, numeric only (no letters). Derived
 * (no counterpart in the mock).
 */
export function fusionId(seed: string): string {
  return "400" + chars(`fusion:${seed}`, 7, DIGITS);
}
