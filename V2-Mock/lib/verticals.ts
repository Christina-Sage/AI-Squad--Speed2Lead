export type Vertical =
  | "hospitality"
  | "general-business"
  | "all"
  | "nfp"
  | "healthcare"
  | "financial-services"
  | "professional-services"
  | "saas";

export interface VerticalInfo {
  id: Vertical;
  label: string;
}

// Sage sales verticals shown in the top-bar selector (Intacct only). Order
// mirrors the source list. "All Vertical" is the neutral default (no vertical
// focus). Selecting a vertical persists the choice AND filters the worklist to
// accounts/leads in that vertical (see verticalForIndustry + matchesVertical).
export const VERTICALS: VerticalInfo[] = [
  { id: "all", label: "All Vertical" },
  { id: "hospitality", label: "Hospitality" },
  { id: "general-business", label: "General Business" },
  { id: "nfp", label: "Not For Profit" },
  { id: "healthcare", label: "Healthcare" },
  { id: "financial-services", label: "Financial Services" },
  { id: "professional-services", label: "Professional Services" },
  { id: "saas", label: "SaaS" },
];

export const VERTICAL_COOKIE = "vertical";

export function getCurrentVertical(verticalId: string | undefined): Vertical {
  return VERTICALS.find((v) => v.id === verticalId)?.id ?? "all";
}

/**
 * Map a Salesforce `industry` to a Sage sales vertical. Keyword-matched
 * (case-insensitive substring) so it survives small industry-label variants;
 * "general-business" is the catch-all for everything that isn't one of the
 * dedicated verticals (manufacturing, wholesale/distribution, construction,
 * retail, …). Never returns "all" — that's the neutral no-filter state.
 */
export function verticalForIndustry(industry: string | null | undefined): Vertical {
  const s = (industry ?? "").toLowerCase();
  if (s.includes("nonprofit") || s.includes("non-profit") || s.includes("not for profit"))
    return "nfp";
  if (s.includes("health")) return "healthcare";
  if (
    s.includes("financial") ||
    s.includes("finance") ||
    s.includes("banking") ||
    s.includes("insurance")
  )
    return "financial-services";
  if (s.includes("hospitality") || s.includes("hotel") || s.includes("restaurant"))
    return "hospitality";
  if (s.includes("saas") || s.includes("software") || s.includes("technology") || s.includes("tech"))
    return "saas";
  if (
    s.includes("professional") ||
    s.includes("consulting") ||
    s.includes("business services") ||
    s.includes("agency") ||
    s.includes("legal")
  )
    return "professional-services";
  return "general-business";
}

/**
 * Whether an account/lead in `industry` belongs on the worklist for the selected
 * vertical. "all" (the neutral default) matches everything; otherwise the
 * industry must map to exactly that vertical.
 */
export function matchesVertical(vertical: Vertical, industry: string | null | undefined): boolean {
  return vertical === "all" || verticalForIndustry(industry) === vertical;
}
