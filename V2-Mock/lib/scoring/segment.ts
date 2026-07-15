export interface SegmentResult {
  value: string;
  good: boolean;
}

/**
 * Segment rules for the Fit pillar's "Segment" signal, by industry:
 *
 * - Nonprofit (and Software, same rules):
 *     revenue < $3M and < 25 FTE            → Emerging
 *     revenue ≥ $3M and 25–150 FTE          → SMB
 *     > 150 FTE                             → Mid-market
 * - General Business / Hospitality: no SMB/Mid-market split — segmenting is
 *   territory-based.
 * - Financial Services: segmented by Assets Under Management (AUM).
 * - Other industries default to the size rule.
 */
export function computeSegment(
  industry: string,
  revenue: number | null,
  fte: number | null,
  aum: string | null = null,
): SegmentResult {
  const ind = industry.toLowerCase();

  if (ind.includes("general business") || ind.includes("hospitality") || ind.includes("business services")) {
    return { value: "Territory-based (no segment)", good: true };
  }

  if (ind.includes("financial")) {
    return aum
      ? { value: `AUM-based — ${aum}`, good: true }
      : { value: "AUM-based — no AUM data", good: false };
  }

  // Nonprofit, Software, and default: size-based rule.
  if (fte !== null && fte > 150) {
    return { value: "Mid-market (>150 FTE)", good: true };
  }
  if (revenue !== null && fte !== null) {
    if (revenue < 3_000_000 && fte < 25) {
      return { value: "Emerging (<$3M · <25 FTE)", good: false };
    }
    return { value: "SMB ($3M+ · 25–150 FTE)", good: true };
  }
  if (fte !== null) {
    return fte < 25
      ? { value: "Emerging (<25 FTE)", good: false }
      : { value: "SMB (25–150 FTE)", good: true };
  }

  return { value: "Unknown — needs sizing", good: false };
}
