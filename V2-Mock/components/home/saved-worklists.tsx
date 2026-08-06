"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";
import type { SavedWorklistView } from "@/lib/worklists/saved";

async function post(url: string, body: unknown) {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function plusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function MiniProgress({ worked, total }: { worked: number; total: number }) {
  const pct = total ? Math.round((worked / total) * 100) : 0;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1 w-14 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular-nums">
        {worked}/{total}
      </span>
    </span>
  );
}

/**
 * Saved-worklist picker for the BDR controls row: switch between "All accounts"
 * and your saved campaign lists (grouped Active / Completed), or save the current
 * worklist with a name and expiration date.
 */
export function SavedWorklistPicker({
  savedLists,
  selectedListId,
  saveAccountIds,
}: {
  savedLists: SavedWorklistView[];
  selectedListId: string | null;
  saveAccountIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [name, setName] = useState("");
  const [expires, setExpires] = useState(plusDays(30));
  const [pending, setPending] = useState(false);

  const active = savedLists.filter((l) => l.status === "active");
  const completed = savedLists.filter((l) => l.status !== "active");
  const current = selectedListId ? savedLists.find((l) => l.id === selectedListId) ?? null : null;

  async function select(id: string) {
    setOpen(false);
    setPending(true);
    try {
      await post("/api/saved-worklists/select", { id });
      router.refresh();
    } finally {
      // router.refresh() re-renders the server tree but keeps this client
      // component mounted, so pending must be cleared explicitly — otherwise the
      // trigger button stays disabled and the picker won't open again.
      setPending(false);
    }
  }

  async function save() {
    if (!name.trim() || saveAccountIds.length === 0) return;
    setPending(true);
    try {
      await post("/api/saved-worklists", {
        name: name.trim(),
        expiresAt: expires || null,
        accountIds: saveAccountIds,
      });
      setDialog(false);
      setName("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function listRow(l: SavedWorklistView) {
    const label =
      l.status === "completed" ? "Completed" : l.status === "expired" ? "Expired" : null;
    return (
      <button
        key={l.id}
        onClick={() => select(l.id)}
        className="flex w-full flex-col gap-1 rounded-[9px] px-2.5 py-2 text-left hover:bg-background"
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          {l.id === selectedListId && <span className="text-primary">✓</span>}
          {l.name}
          {label && (
            <span className="rounded-full bg-success-bg px-1.5 text-[10px] font-bold tracking-[0.3px] text-success uppercase">
              {label}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
          {l.source && (
            <span className="rounded-full border border-border bg-background px-1.5">{l.source}</span>
          )}
          {l.expiresAt && <span>exp {new Date(l.expiresAt).toLocaleDateString()}</span>}
          <MiniProgress worked={l.worked} total={l.total} />
        </span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-1.5 text-[13px] font-semibold hover:border-muted-foreground disabled:opacity-60"
      >
        <span className="text-[11px] font-bold tracking-[0.5px] text-muted-foreground uppercase">
          List
        </span>
        {current?.name ?? "All accounts"}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute left-0 z-20 mt-2 w-[330px] rounded-[12px] border border-border bg-card p-1.5 shadow-lg">
            <button
              onClick={() => select("all")}
              className="flex w-full flex-col rounded-[9px] px-2.5 py-2 text-left hover:bg-background"
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                {!selectedListId && <span className="text-primary">✓</span>}
                All accounts
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                Your full BDR worklist · no expiry
              </span>
            </button>

            {active.length > 0 && (
              <>
                <div className="px-2.5 pt-2 pb-1 text-[10.5px] font-bold tracking-[0.6px] text-muted-foreground uppercase">
                  Your saved lists · Active
                </div>
                {active.map(listRow)}
              </>
            )}
            {completed.length > 0 && (
              <>
                <div className="px-2.5 pt-2 pb-1 text-[10.5px] font-bold tracking-[0.6px] text-muted-foreground uppercase">
                  Completed · kept 30 days
                </div>
                {completed.map(listRow)}
              </>
            )}

            <div className="my-1.5 h-px bg-border" />
            <button
              onClick={() => {
                setOpen(false);
                setDialog(true);
              }}
              className="flex w-full items-center gap-1.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] font-semibold text-primary hover:bg-background"
            >
              <Plus className="size-4" /> Save current worklist…
            </button>
          </div>
        </>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-5">
          <div
            role="dialog"
            aria-modal
            className="w-[380px] max-w-full rounded-[16px] border border-border bg-card p-5 shadow-lg"
          >
            <h3 className="text-[16px] font-bold">Save this worklist</h3>
            <p className="mt-1 mb-4 text-[12.5px] text-muted-foreground">
              Saves the {saveAccountIds.length} account{saveAccountIds.length === 1 ? "" : "s"} in
              this worklist so you can return to this campaign later.
            </p>
            <label className="mb-1 block text-[11px] font-bold tracking-[0.4px] text-muted-foreground uppercase">
              List name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="e.g. Tradeshow — Dreamforce ’26"
              className="mb-3 w-full rounded-[9px] border border-input bg-background px-3 py-2.5 text-[14px] outline-none focus-visible:border-ring"
            />
            <label className="mb-1 block text-[11px] font-bold tracking-[0.4px] text-muted-foreground uppercase">
              Expiration date
            </label>
            <input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className="w-full rounded-[9px] border border-input bg-background px-3 py-2.5 text-[14px] outline-none focus-visible:border-ring"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              On this date the list is archived, then removed after 30 days.
            </p>
            <div className="mt-3 mb-4 flex items-start gap-2 rounded-[10px] border border-primary/25 bg-primary-soft px-3 py-2.5 text-[12px]">
              <span>♻</span>
              <div>
                When every account is worked (Pushed or Not a Fit) the list moves to{" "}
                <b className="text-primary">Completed</b> automatically — reversible, never deleted.
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDialog(false)}
                className="rounded-[9px] px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!name.trim() || pending}
                className="rounded-[9px] border border-primary bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                Save list
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Active saved-list banner shown above the worklist when a saved list is
 * selected: name, source, expiry, progress toward auto-archive, and the manage
 * actions (archive / reopen / remove).
 */
export function SavedWorklistBar({ list }: { list: SavedWorklistView }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function mutate(action: "archive" | "reopen" | "delete") {
    setPending(true);
    try {
      await post(`/api/saved-worklists/${list.id}`, { action });
      router.refresh();
    } finally {
      // Keep the control usable after refresh — router.refresh() doesn't remount
      // this client component, so pending won't reset on its own.
      setPending(false);
    }
  }

  const done = list.status !== "active";
  const pct = list.total ? Math.round((list.worked / list.total) * 100) : 0;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 ${
        done ? "bg-success-bg" : "bg-primary-soft"
      }`}
    >
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] border border-border bg-card font-heading text-[14px] font-black text-primary">
        {done ? "✓" : "▤"}
      </span>
      <div className="min-w-0">
        <div className="text-[14px] font-bold">{list.name}</div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          {list.status === "completed" ? (
            <span>Fully worked — moved to Completed (kept 30 days).</span>
          ) : list.status === "expired" ? (
            <span>Expired — kept 30 days, then removed.</span>
          ) : (
            <>
              {list.source && (
                <span className="rounded-full border border-border bg-card px-1.5">{list.source}</span>
              )}
              {list.expiresAt && <span>expires {new Date(list.expiresAt).toLocaleDateString()}</span>}
              <span>· archives when fully worked</span>
            </>
          )}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-[12.5px] font-semibold tabular-nums">
          {list.worked} / {list.total} worked
        </span>
        <span className="h-1.5 w-[130px] overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </span>
        {/* Example (demo) lists are read-only in-memory data — there's no Convex
            row to archive/reopen/remove, so the manage actions are hidden. */}
        {!list.readOnly && (
          <>
            {list.status === "active" && (
              <button
                onClick={() => mutate("archive")}
                disabled={pending}
                className="rounded-[8px] border border-border bg-card px-2.5 py-1.5 text-[12px] font-semibold hover:border-muted-foreground disabled:opacity-60"
              >
                Archive
              </button>
            )}
            {list.archivedAt && (
              <button
                onClick={() => mutate("reopen")}
                disabled={pending}
                className="rounded-[8px] border border-border bg-card px-2.5 py-1.5 text-[12px] font-semibold hover:border-muted-foreground disabled:opacity-60"
              >
                Reopen
              </button>
            )}
            <button
              onClick={() => mutate("delete")}
              disabled={pending}
              className="rounded-[8px] border border-border bg-card px-2.5 py-1.5 text-[12px] font-semibold text-destructive hover:border-destructive disabled:opacity-60"
            >
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}
