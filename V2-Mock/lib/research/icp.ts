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

export type IcpRole = "Economic Buyer" | "Decision Maker" | "Champion" | "User";

/**
 * Maps a finance/accounting title to its buying-committee role for the ICP role
 * column on the Existing Contacts table. Returns null when the title doesn't
 * resolve to a recognised role (no pill is shown). Order matters — the most
 * senior signal wins (CFO before "director", etc.).
 */
export function classifyIcpRole(title: string): IcpRole | null {
  const t = title.trim().toLowerCase();
  if (!t) return null;
  if (t.includes("cfo") || t.includes("chief financial")) return "Economic Buyer";
  if (t.includes("controller")) return "Champion";
  if (
    t.includes("vp") ||
    t.includes("vice president") ||
    t.includes("director") ||
    t.includes("head of")
  ) {
    return "Decision Maker";
  }
  if (
    t.includes("account") ||
    t.includes("financ") ||
    t.includes("analyst") ||
    t.includes("bookkeep")
  ) {
    return "User";
  }
  return null;
}
