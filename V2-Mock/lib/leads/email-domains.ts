// Personal / ISP email providers whose domain is NOT a company domain — so an
// employer domain can't be inferred from an address at one of these. Scoped to
// the US and Canada for now (the mainstream webmail brands below are used
// throughout both). All entries are lowercase.
//
// Two matchers are combined below:
//  1. PERSONAL_EMAIL_DOMAINS  — exact-domain matches.
//  2. PERSONAL_PROVIDER_STEMS — first-label matches for the big webmail brands
//     that have a few country variants (yahoo.ca, hotmail.ca, …), so we don't
//     have to enumerate each TLD.
const PERSONAL_EMAIL_DOMAINS = new Set<string>([
  // Mainstream webmail (common across the US & Canada)
  "gmail.com", "googlemail.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "aim.com", "proton.me", "protonmail.com", "pm.me",
  "mail.com", "hushmail.com", "fastmail.com",

  // US ISPs / cable providers
  "comcast.net", "xfinity.com", "verizon.net", "att.net", "sbcglobal.net",
  "cox.net", "charter.net", "spectrum.net", "bellsouth.net", "earthlink.net",
  "frontier.com", "roadrunner.com", "rr.com", "optonline.net", "netzero.net",
  "juno.com", "windstream.net", "centurylink.net", "prodigy.net",

  // Canadian ISPs
  "shaw.ca", "telus.net", "rogers.com", "bell.net", "sympatico.ca",
  "videotron.ca", "videotron.qc.ca", "cogeco.ca", "eastlink.ca",
]);

// First-label matches: any TLD variant of these webmail brands counts as
// personal (e.g. yahoo.com / yahoo.ca, hotmail.com / hotmail.ca, outlook.com,
// live.com / live.ca).
const PERSONAL_PROVIDER_STEMS = new Set<string>([
  "yahoo", "ymail", "rocketmail", "hotmail", "outlook", "live", "msn",
  "windowslive",
]);

/** True for personal / ISP email domains (gmail, outlook.*, shaw.ca, …). */
export function isPersonalEmailDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase();
  if (!d) return false;
  if (PERSONAL_EMAIL_DOMAINS.has(d)) return true;
  const firstLabel = d.split(".")[0];
  return PERSONAL_PROVIDER_STEMS.has(firstLabel);
}

/**
 * Company domain inferred from an email address, or null when it can't be: no
 * email, malformed, or a personal/ISP provider (gmail, outlook.*, shaw.ca, …).
 * Lets a lead with no linked account still surface a company domain from a
 * work email.
 */
export function companyDomainFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || !domain.includes(".")) return null;
  return isPersonalEmailDomain(domain) ? null : domain;
}
