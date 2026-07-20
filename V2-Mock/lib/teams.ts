export type Team = "BDR" | "SDR";

export interface TeamInfo {
  id: Team;
  label: string;
  description: string;
}

export const TEAMS: TeamInfo[] = [
  { id: "BDR", label: "BDR", description: "Outbound" },
  { id: "SDR", label: "SDR", description: "Inbound" },
];

export const TEAM_COOKIE = "team";

export function getCurrentTeam(teamId: string | undefined): Team {
  return TEAMS.find((t) => t.id === teamId)?.id ?? "BDR";
}
