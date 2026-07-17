// SDR priority sub-teams. The toggle only appears for the SDR team and filters
// the SDR lead worklist to the selected group (build-plan step 3).
export type PriorityGroup = "P1" | "P2/3" | "P4/5";

export interface PriorityInfo {
  id: PriorityGroup;
  label: string;
  description: string;
}

export const PRIORITIES: PriorityInfo[] = [
  { id: "P1", label: "P1", description: "Top priority leads" },
  { id: "P2/3", label: "P2/3", description: "Mid priority leads" },
  { id: "P4/5", label: "P4/5", description: "Lower priority leads" },
];

export const PRIORITY_COOKIE = "sdr_priority";

// Default to P1, and persist the choice in a cookie so it survives leaving and
// returning to the SDR team.
export function getCurrentPriority(priorityId: string | undefined): PriorityGroup {
  return PRIORITIES.find((p) => p.id === priorityId)?.id ?? "P1";
}
