/**
 * Outreach sequences a rep can push contacts into, grouped by segment. The
 * groups drive the `<optgroup>` / Combobox grouping in the work-it pickers;
 * `SEQUENCES` is the flat list derived from them, used for the default
 * selection and server-side validation. Keep the groups as the single source
 * of truth — do not maintain a separate flat list.
 */
export interface SequenceGroup {
  /** Segment heading shown above the group in the picker. */
  value: string;
  /** Sequence names in this segment. */
  items: string[];
}

export const SEQUENCE_GROUPS: SequenceGroup[] = [
  {
    value: "Nonprofit (NFP)",
    items: [
      "NA US Medium Intacct SDR NFP Controller & Director 5/23 (21 steps)",
      "NA US Medium Intacct SDR NFP LT Nurture 5/23 (11 steps)",
      "NA US Medium Intacct SDR NFP Controller & Director 1/16/24 (18 steps)",
      "NA US Medium Intacct SDR NFP CFO & VP 1/16/24 (18 steps)",
      "NA US Medium Intacct SDR NFP Long Nurture 1/16/24 (11 steps)",
      "NA US Medium Intacct SDR NFP Short Nurture 1/16/24 (11 steps)",
      "NA US Medium NFP CFO & VP [High Touch] - Oct 2024 (18 steps)",
      "NFP Nationals Human Services United Way V2 (15 steps)",
      "NFP Generic Long Nurture Sequence 2026 (23 steps)",
    ],
  },
  {
    value: "General Business (GB)",
    items: [
      "NA US Medium Intacct SDR GB Controller & Director 1/8/24 (18 steps)",
      "NA US Medium Intacct SDR GB CFO & VP 1/8/24 (18 steps)",
      "NA US Medium Intacct SDR GB Long Nurture 1/8/24 (11 steps)",
      "NA US Medium Intacct SDR GB Non DM 1/8/24 (11 steps)",
      "NA US Medium Intacct SDR GB Short Nurture 1/8/24 (11 steps)",
      "NA US Medium Intacct SDR GB LT Nurture 5/31/2023 (11 steps)",
      "NA US Medium Intacct SDR MQL GB High 4/2022 (19 steps)",
      "US SI OB GB Tier 2 TOY FS Low - 6/2022 (15 steps)",
      "NA US Medium Intacct SDR - GB Director/Controller Top Down (20 steps)",
      "NA US Medium GB Economic Buyer [High Touch] (26 steps)",
    ],
  },
  {
    value: "PST",
    items: [
      "NA US Medium Intacct SDR PST CFO & VP 5/23 (23 steps)",
      "NA US Medium Intacct SDR PST LT Nurture 5/23 (11 steps)",
    ],
  },
  {
    value: "Industry / Vertical",
    items: [
      "NA US Medium Intacct SDR ICP BioTech Medium 3/2022 (27 steps)",
      "NA US Medium Intacct SDR Software CFO & VP 1/8/24 (19 steps)",
      "NA US Medium SaaS Economic Buyer [High Touch] - Jan 2025 (22 steps)",
      "Funding Priority SAAS Sequence (14 steps)",
      "NA US Medium Prof Service DM & Champion [High Touch] - 10/24 (18 steps)",
      "NA US Medium Hospitality Restaurants - August 2025 (18 steps)",
      "NA US Medium Hospitality Lodging - September 2025 (18 steps)",
    ],
  },
  {
    value: "Finance Leaders",
    items: [
      "Champion/Buyer Alumni Play (Finance Leaders) (17 steps)",
      "New to Role (Finance Leaders) (17 steps)",
    ],
  },
  {
    value: "General / Top of Funnel",
    items: [
      "NA US Medium Intacct SDR SI OB Forecast In Month High - 5/24 (8 steps)",
      "NA US BDR Trucking Logistics 12/2025 (11 steps)",
      "Top of Funnel Sequence - OB8 and OB2 and OB3 (12 steps)",
    ],
  },
];

/** Flat list of every sequence value — used for defaults and server validation. */
export const SEQUENCES: string[] = SEQUENCE_GROUPS.flatMap((g) => g.items);

export interface OutreachPush {
  sequence: string;
  contactNames: string[];
  pushedBy: string;
  pushedAt: string;
}
