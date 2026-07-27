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

// Sage sales verticals shown in the top-bar selector. Order mirrors the source
// list. "All-Vertical/Horizontal" is the neutral default (no vertical focus).
// Selecting a vertical persists the choice; it does not filter the worklist yet
// (accounts carry an `industry`, not a sales vertical — mapping the two is a
// separate decision).
export const VERTICALS: VerticalInfo[] = [
  { id: "hospitality", label: "Hospitality" },
  { id: "general-business", label: "General Business" },
  { id: "all", label: "All-Vertical/Horizontal" },
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
