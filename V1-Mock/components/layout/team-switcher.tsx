"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEAMS, type Team } from "@/lib/teams";

export function TeamSwitcher({ currentTeam }: { currentTeam: Team }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(team: string | null) {
    if (!team) return;
    setPending(true);
    await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team }),
    });
    setPending(false);
    router.refresh();
  }

  const currentLabel = TEAMS.find((t) => t.id === currentTeam)?.label ?? TEAMS[0].label;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">Team:</span>
      <Select value={currentTeam} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger
          size="sm"
          className="w-auto rounded-full border-white/15 bg-transparent px-3 hover:bg-white/5"
        >
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TEAMS.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              <div className="flex flex-col">
                <span>{team.label}</span>
                {team.description && (
                  <span className="text-xs text-muted-foreground">{team.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
