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
import { VERTICALS, type Vertical } from "@/lib/verticals";

export function VerticalSwitcher({ currentVertical }: { currentVertical: Vertical }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(vertical: string | null) {
    if (!vertical) return;
    setPending(true);
    await fetch("/api/vertical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vertical }),
    });
    setPending(false);
    router.refresh();
  }

  const currentLabel =
    VERTICALS.find((v) => v.id === currentVertical)?.label ?? VERTICALS[0].label;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">Vertical:</span>
      <Select value={currentVertical} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger
          size="sm"
          className="w-auto rounded-full border-border bg-transparent px-3 hover:bg-accent"
        >
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {VERTICALS.map((vertical) => (
            <SelectItem key={vertical.id} value={vertical.id}>
              {vertical.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
