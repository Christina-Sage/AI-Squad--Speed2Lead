export const SEQUENCES: string[] = [
  "Nonprofit — Intacct Intro (12 steps)",
  "Fast Follow — Inbound (6 steps)",
  "Reactivation — Recycled MQL (8 steps)",
  "Manufacturing — Automation Play (10 steps)",
];

export interface OutreachPush {
  sequence: string;
  contactNames: string[];
  pushedBy: string;
  pushedAt: string;
}
