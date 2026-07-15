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
import { DEMO_USERS } from "@/lib/auth/demo-user";

export function DemoUserSwitcher({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleChange(userId: string | null) {
    if (!userId) return;
    setPending(true);
    await fetch("/api/demo-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setPending(false);
    router.refresh();
  }

  const currentLabel = DEMO_USERS.find((u) => u.id === currentUserId)?.name ?? DEMO_USERS[0].name;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">Demo User (v1 stub):</span>
      <Select value={currentUserId} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger
          size="sm"
          className="w-auto rounded-full border-white/15 bg-transparent px-3 hover:bg-white/5"
        >
          <SelectValue>{currentLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DEMO_USERS.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
