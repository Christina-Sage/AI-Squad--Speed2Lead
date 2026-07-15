const USER_AGENT = "Mozilla/5.0 (compatible; DedupeEngineResearchBot/1.0)";

interface SearchResult {
  title: string;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

// Only trust the match if the names clearly refer to the same thing, since
// generic/fictional account names otherwise return unrelated top hits.
function isConfidentMatch(query: string, title: string): boolean {
  const a = normalize(query);
  const b = normalize(title);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

export async function getWikipediaSummary(name: string): Promise<string | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      name,
    )}&format=json&srlimit=3`;
    const searchRes = await fetch(searchUrl, { headers: { "User-Agent": USER_AGENT } });
    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as { query?: { search?: SearchResult[] } };
    const results = searchData.query?.search ?? [];
    const best = results.find((r) => isConfidentMatch(name, r.title));
    if (!best) return null;

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(best.title)}`;
    const summaryRes = await fetch(summaryUrl, { headers: { "User-Agent": USER_AGENT } });
    if (!summaryRes.ok) return null;

    const summaryData = (await summaryRes.json()) as { type?: string; extract?: string };
    if (summaryData.type !== "standard" || !summaryData.extract) return null;

    return summaryData.extract;
  } catch {
    return null;
  }
}
