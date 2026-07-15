"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_USERS, type DemoUser } from "@/lib/auth/demo-user";
import { cn } from "@/lib/utils";

export function OwnerEditor({
  accountId,
  currentOwnerName,
}: {
  accountId: string;
  currentOwnerName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matchedUser = DEMO_USERS.find((u) => u.name === currentOwnerName) ?? null;

  async function handleChange(user: DemoUser | null) {
    if (!user || user.name === currentOwnerName) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, ownerId: user.id }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to update owner.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong while updating the owner.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Combobox.Root
        items={DEMO_USERS}
        itemToStringLabel={(u: DemoUser) => u.name}
        itemToStringValue={(u: DemoUser) => u.id}
        value={matchedUser}
        onValueChange={handleChange}
        disabled={pending}
      >
        <Combobox.Trigger
          className={cn(
            "-mx-1 inline-flex items-center gap-1 rounded-md px-1 font-bold text-foreground hover:bg-accent hover:underline",
            pending && "opacity-50",
          )}
        >
          <Combobox.Value>{(value: DemoUser | null) => value?.name ?? currentOwnerName}</Combobox.Value>
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner className="isolate z-50" sideOffset={4}>
            <Combobox.Popup className="w-56 origin-(--transform-origin) rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
              <Combobox.Input
                placeholder="Search name..."
                className="mb-1 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring"
              />
              <Combobox.Empty className="px-2 py-1.5 text-sm text-muted-foreground">
                No match.
              </Combobox.Empty>
              <Combobox.List>
                {(user: DemoUser) => (
                  <Combobox.Item
                    key={user.id}
                    value={user}
                    className="relative flex cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent"
                  >
                    {user.name}
                    <Combobox.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                      <CheckIcon className="size-3.5" />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
