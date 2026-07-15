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
import { ABM_ACCOUNT_STATUSES } from "@/lib/abm-status";

const NONE_VALUE = "__none__";
const NONE_LABEL = "--None--";

export function AbmStatusEditor({
  accountId,
  currentStatus,
}: {
  accountId: string;
  currentStatus: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(value: string | null) {
    if (!value) return;
    const status = value === NONE_VALUE ? null : value;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/abm-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, status }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to update ABM Account Status.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong while updating ABM Account Status.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Select value={currentStatus ?? NONE_VALUE} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger
          size="sm"
          className="-mx-1 w-auto rounded-md border-transparent bg-transparent px-1 font-medium hover:border-white/15 hover:bg-white/5"
        >
          <SelectValue>{currentStatus ?? NONE_LABEL}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>{NONE_LABEL}</SelectItem>
          {ABM_ACCOUNT_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
