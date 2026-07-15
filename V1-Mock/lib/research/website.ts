import * as cheerio from "cheerio";
import type { FoundContact } from "@/lib/research/types";

const USER_AGENT = "Mozilla/5.0 (compatible; DedupeEngineResearchBot/1.0)";
const FETCH_TIMEOUT_MS = 8000;

const ABOUT_PAGE_PATTERNS = ["about", "about-us", "who-we-are", "company", "our-story"];
const TEAM_PAGE_PATTERNS = ["team", "leadership", "our-team", "leadership-team", "people", "management"];

const TITLE_KEYWORDS = [
  "director of finance",
  "director of accounting",
  "director of development",
  "director of technology",
  "controller",
  "chief financial officer",
  "cfo",
  "vp of finance",
  "vice president of finance",
  "finance manager",
  "accounting manager",
  "accountant",
  "ceo",
  "chief executive officer",
  "president",
  "founder",
];

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function findSubPageUrl($: cheerio.CheerioAPI, baseUrl: string, patterns: string[]): string | null {
  let found: string | null = null;
  $("a[href]").each((_, el) => {
    if (found) return;
    const href = $(el).attr("href");
    if (!href) return;
    const lower = href.toLowerCase();
    if (patterns.some((p) => lower.includes(p))) {
      try {
        found = new URL(href, baseUrl).toString();
      } catch {
        // ignore malformed hrefs
      }
    }
  });
  return found;
}

function extractVisibleText($: cheerio.CheerioAPI): string {
  $("script, style, nav, header, footer, noscript").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

function extractHistorySnippet(text: string): string | null {
  if (!text) return null;
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 40 && s.length < 400);
  if (sentences.length === 0) return null;
  return sentences.slice(0, 3).join(" ");
}

function extractEmployeeCount(text: string): number | null {
  const match = text.match(/([\d,]{2,7})\+?\s*(employees|team members|people worldwide|staff members)/i);
  if (!match) return null;
  const num = parseInt(match[1].replace(/,/g, ""), 10);
  return Number.isFinite(num) ? num : null;
}

function looksLikeName(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 4 || trimmed.length > 40) return false;
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return words.every((w) => /^[A-Z][a-zA-Z'.-]*$/.test(w));
}

function extractPeople($: cheerio.CheerioAPI): FoundContact[] {
  const found: FoundContact[] = [];
  const seen = new Set<string>();

  $("script, style").remove();
  $("*").each((_, el) => {
    const node = $(el);
    const ownText = node
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim();
    if (!ownText || ownText.length > 60) return;

    const lowerText = ownText.toLowerCase();
    const matchedKeyword = TITLE_KEYWORDS.find((kw) => lowerText.includes(kw));
    if (!matchedKeyword) return;

    const candidates: string[] = [];
    const prev = $(el).prev();
    if (prev.length) candidates.push(prev.text().trim());
    const parentPrev = $(el).parent().prev();
    if (parentPrev.length) candidates.push(parentPrev.text().trim());
    const next = $(el).next();
    if (next.length) candidates.push(next.text().trim());

    const name = candidates.find(looksLikeName);
    if (!name) return;

    const key = `${name}|${ownText}`;
    if (seen.has(key)) return;
    seen.add(key);

    found.push({
      name,
      title: ownText,
      source: "website",
      isIcpMatch: false,
      inSalesforce: false,
      matchedRecord: null,
    });
  });

  return found;
}

export interface WebsiteResearchResult {
  companyHistory: string | null;
  employeeCount: number | null;
  foundContacts: FoundContact[];
  pagesFetched: string[];
  error: string | null;
}

export async function researchWebsite(domain: string): Promise<WebsiteResearchResult> {
  const homepageUrl = `https://${domain}`;
  const homepageRes = await fetchWithTimeout(homepageUrl);

  if (!homepageRes) {
    return {
      companyHistory: null,
      employeeCount: null,
      foundContacts: [],
      pagesFetched: [],
      error: `Could not reach ${homepageUrl}.`,
    };
  }

  const pagesFetched = [homepageUrl];
  const homepageHtml = await homepageRes.text();
  const $home = cheerio.load(homepageHtml);

  const aboutUrl = findSubPageUrl($home, homepageUrl, ABOUT_PAGE_PATTERNS);
  const teamUrl = findSubPageUrl($home, homepageUrl, TEAM_PAGE_PATTERNS);

  const homeText = extractVisibleText($home);
  let aboutText: string | null = null;
  let employeeCount = extractEmployeeCount(homeText);
  let foundContacts = extractPeople($home);

  if (aboutUrl && aboutUrl !== homepageUrl) {
    const aboutRes = await fetchWithTimeout(aboutUrl);
    if (aboutRes) {
      pagesFetched.push(aboutUrl);
      const $about = cheerio.load(await aboutRes.text());
      aboutText = extractVisibleText($about);
      employeeCount = employeeCount ?? extractEmployeeCount(aboutText);
      foundContacts = [...foundContacts, ...extractPeople($about)];
    }
  }

  // Prefer the About page for the history snippet — homepage text is usually
  // nav/contact boilerplate, while About pages have the actual narrative.
  const historyText = aboutText ? `${aboutText} ${homeText}` : homeText;

  if (teamUrl && teamUrl !== homepageUrl && teamUrl !== aboutUrl) {
    const teamRes = await fetchWithTimeout(teamUrl);
    if (teamRes) {
      pagesFetched.push(teamUrl);
      const $team = cheerio.load(await teamRes.text());
      foundContacts = [...foundContacts, ...extractPeople($team)];
    }
  }

  const dedupedContacts = Array.from(
    new Map(foundContacts.map((c) => [`${c.name}|${c.title}`, c])).values(),
  );

  return {
    companyHistory: extractHistorySnippet(historyText),
    employeeCount,
    foundContacts: dedupedContacts,
    pagesFetched,
    error: null,
  };
}
