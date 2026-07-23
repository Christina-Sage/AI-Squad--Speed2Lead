import type { PanelSignals } from "@/components/workit/work-it-panel";

export interface AccountNoteSection {
  title: string;
  lines: string[];
}

export interface AccountNote {
  /** Display heading, e.g. "ACME ROBOTICS · Account brief". */
  meta: string;
  sections: AccountNoteSection[];
  hashtags: string[];
  /** Plain-text rendering copied to the clipboard for pasting into Outreach. */
  text: string;
}

function hashtag(value: string): string {
  return `#${value.replace(/[^a-zA-Z0-9]/g, "")}`;
}

/**
 * Builds the copy-ready account summary shown in the Push to Outreach box, from
 * the same signals the panel already displays. The structured form drives the
 * on-screen note; `text` is the plain-text version reps paste into Outreach.
 */
export function buildAccountNote(input: {
  accountName: string;
  industry?: string;
  signals: PanelSignals;
}): AccountNote {
  const { accountName, industry, signals } = input;

  const companyBits: string[] = [];
  if (industry) companyBits.push(industry);
  if (signals.revenue && signals.revenue !== "Not available") {
    companyBits.push(`${signals.revenue} est. revenue (${signals.source})`);
  }
  if (signals.fte && signals.fte !== "n/a") companyBits.push(`${signals.fte} employees`);

  const sections: AccountNoteSection[] = [];
  if (companyBits.length > 0) {
    sections.push({ title: "Company", lines: [companyBits.join(" · ")] });
  }
  sections.push({
    title: "Why prioritized",
    lines: [signals.whyPrioritized, `Intent: ${signals.intent}`],
  });

  const hashtags: string[] = [];
  if (industry) hashtags.push(hashtag(industry));
  const tier = signals.whyPrioritized.match(/\(([^)]+)\)/)?.[1];
  if (tier) hashtags.push(hashtag(tier));
  if (signals.intent && !/^no\b/i.test(signals.intent)) hashtags.push("#HighIntent");

  const meta = `${accountName.toUpperCase()} · Account brief`;

  const text = [
    `${accountName.toUpperCase()} — Account brief`,
    "",
    ...sections.flatMap((s) => [s.title, ...s.lines.map((l) => `- ${l}`), ""]),
    hashtags.join(" "),
  ]
    .join("\n")
    .trim();

  return { meta, sections, hashtags, text };
}
