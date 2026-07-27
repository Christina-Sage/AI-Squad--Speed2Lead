import type {
  PanelSignals,
  OutreachNoteSignals,
  ZoomInfoNoteSignals,
} from "@/components/workit/work-it-panel";
import type { IntentDetail } from "@/lib/scoring/scoring";
import type { CompanyIntel } from "@/lib/research/company-intel";

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
 * Maps the 6Sense intent breakdown + ZoomInfo enrichment onto the Outreach /
 * ZoomInfo note groups the copy note renders. Kept here so all three call sites
 * (work-it page + the two work-it API routes) build the same shape. Returns an
 * empty object when neither source has anything, so the note falls back to the
 * plain score line.
 */
export function buildNoteSourceSignals(input: {
  intentDetail?: IntentDetail | null;
  intel?: CompanyIntel | null;
}): { outreach?: OutreachNoteSignals; zoomInfo?: ZoomInfoNoteSignals } {
  const { intentDetail, intel } = input;
  const result: { outreach?: OutreachNoteSignals; zoomInfo?: ZoomInfoNoteSignals } = {};

  const growthSignals = intel?.growthSignals ?? [];
  if (intentDetail || growthSignals.length > 0) {
    result.outreach = {
      sixSenseKeywords: intentDetail?.keywords ?? [],
      websiteVisits: intentDetail?.websiteVisits.value ?? "",
      buyingStage: intentDetail?.buyingStage.value ?? "",
      growthSignals,
    };
  }

  if (intel?.zoomInfo) {
    result.zoomInfo = {
      technologies: intel.zoomInfo.technologies,
      intentTopics: intel.zoomInfo.intentTopics,
      webSightings: intel.zoomInfo.webSightings,
    };
  }

  return result;
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

  // Outreach bucket — 6Sense keywords, growth signals, website visits, and the
  // intent/trigger reading. Only present on the account work-it path.
  const outreach = signals.outreach;
  const outreachLines: string[] = [];
  if (outreach) {
    if (outreach.sixSenseKeywords.length > 0) {
      outreachLines.push(`6Sense keywords: ${outreach.sixSenseKeywords.join(", ")}`);
    }
    if (outreach.buyingStage) {
      outreachLines.push(`Intent & triggers: ${outreach.buyingStage}`);
    }
    if (outreach.websiteVisits) {
      outreachLines.push(`Website visits: ${outreach.websiteVisits}`);
    }
    outreach.growthSignals.forEach((g) => outreachLines.push(`Growth: ${g}`));
  }

  // ZoomInfo bucket — related technologies, intent topics, and WebSights.
  const zoomInfo = signals.zoomInfo;
  const zoomInfoLines: string[] = [];
  if (zoomInfo) {
    if (zoomInfo.technologies.length > 0) {
      zoomInfoLines.push(`Related technologies: ${zoomInfo.technologies.join(", ")}`);
    }
    if (zoomInfo.intentTopics.length > 0) {
      zoomInfoLines.push(`Intent: ${zoomInfo.intentTopics.join(", ")}`);
    }
    if (zoomInfo.webSightings) {
      zoomInfoLines.push(`Web sightings: ${zoomInfo.webSightings}`);
    }
  }

  const hasSourceSignals = outreachLines.length > 0 || zoomInfoLines.length > 0;

  // Why prioritized — always the score line; the standalone Intent line is only
  // needed when the richer source breakdown below isn't available.
  const whyLines = [signals.whyPrioritized];
  if (!hasSourceSignals) whyLines.push(`Intent: ${signals.intent}`);
  sections.push({ title: "Why prioritized", lines: whyLines });

  if (outreachLines.length > 0) {
    sections.push({ title: "Outreach", lines: outreachLines });
  }
  if (zoomInfoLines.length > 0) {
    sections.push({ title: "ZoomInfo", lines: zoomInfoLines });
  }

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
