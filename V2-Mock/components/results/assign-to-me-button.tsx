"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AssignToMeButton({
  accountId,
  isCurrentOwner,
}: {
  accountId: string;
  isCurrentOwner: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to assign account.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong while assigning this account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={pending || isCurrentOwner}>
        {isCurrentOwner ? "Assigned to Me" : pending ? "Assigning..." : "Assign to Me"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
