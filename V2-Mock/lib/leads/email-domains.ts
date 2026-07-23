// Personal / ISP email providers whose domain is NOT a company domain — so an
// employer domain can't be inferred from an address at one of these. This tool
// is used by reps worldwide, so the list is global, not just North American.
// All entries are lowercase.
//
// Two matchers are combined below:
//  1. PERSONAL_EMAIL_DOMAINS  — exact-domain matches.
//  2. PERSONAL_PROVIDER_STEMS — first-label matches for big webmail brands that
//     have dozens of country-code variants (yahoo.co.uk, hotmail.de, …), so we
//     don't have to enumerate every TLD.
const PERSONAL_EMAIL_DOMAINS = new Set<string>([
  // Global webmail
  "gmail.com", "googlemail.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "aim.com", "proton.me", "protonmail.com", "pm.me",
  "gmx.com", "gmx.net", "gmx.de", "gmx.at", "gmx.ch",
  "mail.com", "email.com", "usa.com", "fastmail.com", "fastmail.fm",
  "hushmail.com", "tutanota.com", "tuta.io", "zoho.com", "zohomail.com",
  "yandex.com", "yandex.ru", "ya.ru", "mail.ru", "inbox.ru", "bk.ru",
  "list.ru", "rambler.ru", "internet.ru",

  // North America ISPs
  "comcast.net", "verizon.net", "att.net", "sbcglobal.net", "cox.net",
  "charter.net", "spectrum.net", "bellsouth.net", "earthlink.net",
  "frontier.com", "roadrunner.com", "optonline.net", "netzero.net",
  "juno.com", "windstream.net", "centurylink.net", "prodigy.net",
  "shaw.ca", "telus.net", "rogers.com", "bell.net", "sympatico.ca",
  "videotron.ca", "videotron.qc.ca", "cogeco.ca", "eastlink.ca", "nl.rogers.com",

  // UK & Ireland
  "btinternet.com", "sky.com", "virginmedia.com", "talktalk.net",
  "ntlworld.com", "blueyonder.co.uk", "tiscali.co.uk", "eircom.net",

  // Germany / Austria / Switzerland
  "web.de", "t-online.de", "freenet.de", "arcor.de", "bluewin.ch",

  // France / Belgium
  "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net",
  "neuf.fr", "bbox.fr", "skynet.be", "telenet.be",

  // Netherlands
  "ziggo.nl", "kpnmail.nl", "home.nl", "hetnet.nl", "planet.nl",

  // Southern / Eastern Europe
  "libero.it", "virgilio.it", "tin.it", "alice.it", "tiscali.it",
  "terra.es", "telefonica.net", "wp.pl", "o2.pl", "interia.pl",
  "seznam.cz", "centrum.cz",

  // Nordics
  "telia.com", "hotmail.se", "spray.se", "online.no",

  // Asia-Pacific
  "qq.com", "foxmail.com", "163.com", "126.com", "yeah.net",
  "sina.com", "sina.cn", "sohu.com", "aliyun.com", "139.com",
  "naver.com", "daum.net", "hanmail.net", "nate.com",
  "docomo.ne.jp", "ezweb.ne.jp", "softbank.ne.jp", "nifty.com",
  "biglobe.ne.jp", "so-net.ne.jp", "rediffmail.com",
  "bigpond.com", "bigpond.net.au", "optusnet.com.au", "iinet.net.au",
  "xtra.co.nz",

  // Latin America
  "uol.com.br", "bol.com.br", "terra.com.br", "ig.com.br", "globo.com",
  "prodigy.net.mx",

  // Africa / Middle East
  "telkomsa.net", "walla.com", "walla.co.il",
]);

// First-label matches: any TLD variant of these big webmail brands counts as
// personal (e.g. yahoo.com, yahoo.co.uk, yahoo.fr; hotmail.de; outlook.es).
const PERSONAL_PROVIDER_STEMS = new Set<string>([
  "yahoo", "ymail", "rocketmail", "hotmail", "outlook", "live", "msn",
  "windowslive",
]);

/** True for personal / ISP email domains (gmail, outlook.*, shaw.ca, qq.com …). */
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
