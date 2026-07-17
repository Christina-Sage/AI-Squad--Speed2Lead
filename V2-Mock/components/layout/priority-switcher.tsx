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
import { PRIORITIES, type PriorityGroup } from "@/lib/priority";

export function PrioritySwitcher({ currentPriority }: { currentPriority: PriorityGroup }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(priority: string | null) {
    if (!priority) return;
    setPending(true);
    await fetch("/api/priority", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
    setPending(false);
    router.refresh();
  }

  const currentLabel =
    PRIORITIES.find((p) => p.id === currentPriority)?.label ?? PRIORITIES[0].label;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">Priority:</span>
      <Select value={currentPriority} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger
          size="sm"
          className="w-auto rounded-full border-border bg-transparent px-3 hover:bg-accent"
        >
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map((priority) => (
            <SelectItem key={priority.id} value={priority.id}>
              <div className="flex flex-col">
                <span>{priority.label}</span>
                {priority.description && (
                  <span className="text-xs text-muted-foreground">{priority.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
