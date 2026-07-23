// Consumer / ISP email providers whose domain is NOT a company domain — so an
// employer domain can't be inferred from an address at one of these. Lowercase.
const PERSONAL_EMAIL_DOMAINS = new Set<string>([
  // Webmail
  "gmail.com", "googlemail.com", "outlook.com", "outlook.co.uk", "hotmail.com", "hotmail.co.uk",
  "hotmail.ca", "live.com", "live.ca", "msn.com", "yahoo.com", "yahoo.ca", "yahoo.co.uk",
  "ymail.com", "aol.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com",
  "gmx.com", "gmx.net", "mail.com", "fastmail.com", "pm.me", "zoho.com", "yandex.com",
  // Common North American ISPs (personal addresses)
  "shaw.ca", "telus.net", "rogers.com", "bell.net", "sympatico.ca", "videotron.ca", "cogeco.ca",
  "eastlink.ca", "comcast.net", "verizon.net", "att.net", "sbcglobal.net", "cox.net",
  "charter.net", "bellsouth.net", "earthlink.net", "frontier.com",
]);

/** True for personal / ISP email domains (gmail, outlook, shaw.ca, …). */
export function isPersonalEmailDomain(domain: string): boolean {
  return PERSONAL_EMAIL_DOMAINS.has(domain.trim().toLowerCase());
}

/**
 * Company domain inferred from an email address, or null when it can't be: no
 * email, malformed, or a personal/ISP provider (gmail, outlook, shaw.ca, …).
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
