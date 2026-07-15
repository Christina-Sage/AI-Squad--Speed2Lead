const ICP_EXACT_TITLES = [
  "director of finance",
  "director of accounting",
  "controller",
  "director of development",
  "director of technology",
  "cfo",
];

// Stems rather than exact words, so "Financial" / "Accountant" / "Accounts" also match.
const ICP_KEYWORDS = ["financ", "account"];

export function matchesIcp(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return false;

  if (ICP_EXACT_TITLES.some((t) => normalized.includes(t))) return true;
  if (ICP_KEYWORDS.some((keyword) => normalized.includes(keyword))) return true;

  return false;
}
