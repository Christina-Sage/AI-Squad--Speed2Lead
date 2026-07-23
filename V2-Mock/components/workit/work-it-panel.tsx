"use client";

import { useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import type { HygieneSuggestion } from "@/lib/workit/hygiene";
import { SEQUENCE_GROUPS, type OutreachPush, type SequenceGroup } from "@/lib/outreach";
import { NOT_A_FIT_REASONS } from "@/lib/workit/not-a-fit";

// After a record is worked (pushed or marked not-a-fit) we return to the
// worklist, which re-derives worked-state server-side and shows the "next up"
// banner. A full navigation is what refreshes that server-derived state.
function returnToWorklist(accountId: string) {
  window.location.assign(`/?worked=${encodeURIComponent(accountId)}`);
}

export interface PanelContact {
  name: string;
  title: string;
  source: "990" | "website";
  isIcpMatch: boolean;
  inSalesforce: boolean;
}

export interface PanelExistingRecord {
  name: string;
  title: string;
  kind: "Contact" | "Lead";
}

export interface PanelSignals {
  revenue: string;
  fte: string;
  source: string;
  intent: string;
  whyPrioritized: string;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
}

function Card({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 rounded-[14px] border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <h2 className="text-[15.5px] font-semibold">{title}</h2>
        {sub && <span className="text-[12.5px] text-muted-foreground">{sub}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const btnSm =
  "rounded-[7px] border border-border bg-card px-2.5 py-1 text-[12.5px] font-semibold hover:border-muted-foreground disabled:opacity-45";

export function WorkItPanel({
  accountId,
  foundContacts,
  existingRecords,
  hygiene,
  sequences,
  signals,
  initialAppliedFields,
  initialPush,
}: {
  accountId: string;
  foundContacts: PanelContact[];
  existingRecords: PanelExistingRecord[];
  hygiene: HygieneSuggestion[];
  sequences: string[];
  signals: PanelSignals;
  initialAppliedFields: string[];
  initialPush: OutreachPush | null;
}) {
  const toast = useToast();
  // Found contacts start selected; existing SFDC contacts/leads are opt-in.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(foundContacts.map((c) => c.name)),
  );
  const [applied, setApplied] = useState<Set<string>>(() => new Set(initialAppliedFields));
  const [push, setPush] = useState<OutreachPush | null>(initialPush);
  const [sequence, setSequence] = useState(sequences[0]);
  const [notFitReason, setNotFitReason] = useState(NOT_A_FIT_REASONS[0]);
  const [busy, setBusy] = useState<string | null>(null);

  async function applyHygiene(h: HygieneSuggestion) {
    setBusy(`hy-${h.field}`);
    try {
      const res = await fetch("/api/hygiene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, field: h.field, newValue: h.suggested }),
      });
      const data = await res.json();
      if (!data.success) {
        toast(data.error ?? "Failed to update field");
        return;
      }
      setApplied((prev) => new Set(prev).add(h.field));
      toast("Field updated in Salesforce");
    } catch {
      toast("Failed to update field");
    } finally {
      setBusy(null);
    }
  }

  function toggleSelected(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Everything that can enter a sequence: research finds + existing SFDC records.
  const pushable: { name: string; subtitle: string }[] = [
    ...foundContacts.map((c) => ({
      name: c.name,
      subtitle: `${c.title}${c.inSalesforce ? " · In SFDC" : ""}`,
    })),
    ...existingRecords.map((r) => ({
      name: r.name,
      subtitle: `${r.title} · ${r.kind}`,
    })),
  ];

  async function pushOutreach() {
    const names = pushable.filter((p) => selected.has(p.name)).map((p) => p.name);
    if (names.length === 0) return;
    setBusy("push");
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, sequence, contactNames: names }),
      });
      const data = await res.json();
      if (!data.success) {
        toast(data.error ?? "Failed to push to Outreach");
        return;
      }
      setPush(data.push);
      toast(
        `${names.length} contact${names.length > 1 ? "s" : ""} pushed to “${sequence}” — back to your worklist`,
      );
      returnToWorklist(accountId);
    } catch {
      toast("Failed to push to Outreach");
      setBusy(null);
    }
  }

  async function markNotAFit() {
    setBusy("notfit");
    try {
      const res = await fetch("/api/not-a-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, reason: notFitReason }),
      });
      const data = await res.json();
      if (!data.success) {
        toast(data.error ?? "Failed to mark Not a Fit");
        setBusy(null);
        return;
      }
      toast(`Marked “Not a Fit” — ${notFitReason}`);
      returnToWorklist(accountId);
    } catch {
      toast("Failed to mark Not a Fit");
      setBusy(null);
    }
  }

  const selectedCount = pushable.filter((p) => selected.has(p.name)).length;

  return (
    <>
      <Card title="Data Hygiene" sub="BC#4 — suggested SFDC field updates from research">
        {hygiene.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No field updates suggested — record looks clean.
          </p>
        ) : (
          hygiene.map((h) => (
            <div
              key={h.field}
              className="flex items-center gap-3 border-b border-border py-2.5 text-[13px] last:border-b-0"
            >
              <span className="w-[150px] shrink-0 font-semibold">{h.field}</span>
              <span className="text-muted-foreground line-through">{h.current}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold text-success">{h.suggested}</span>
              <span className="flex-1" />
              {applied.has(h.field) ? (
                <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] text-success uppercase">
                  Applied
                </span>
              ) : (
                <button
                  className={btnSm}
                  disabled={busy === `hy-${h.field}`}
                  onClick={() => applyHygiene(h)}
                >
                  {busy === `hy-${h.field}` ? "Applying…" : "Apply to SFDC"}
                </button>
              )}
            </div>
          ))
        )}
      </Card>

      <Card
        title="Push to Outreach"
        sub="BC#3 — selected contacts enter a sequence; signals land on the Outreach dashboard"
      >
        {push ? (
          <div>
            <div className="mb-4 flex items-start gap-3.5 rounded-[14px] border border-success-bg bg-success-soft px-5 py-4">
              <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-success-bg text-[19px] font-extrabold text-success">
                ✓
              </div>
              <div>
                <h3 className="font-heading text-base font-black">Pushed to Outreach</h3>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {push.contactNames.length} contact{push.contactNames.length > 1 ? "s" : ""} added
                  to <b className="text-foreground">{push.sequence}</b>. First touch scheduled for
                  tomorrow 8:00 AM.
                </p>
              </div>
            </div>
            <p className="mb-1 text-[13px] font-bold">Signals attached to the Outreach dashboard</p>
            {[
              ["💰", "Revenue signal", `${signals.revenue} est. annual revenue (${signals.source})`],
              ["📈", "Growth signal", `headcount ${signals.fte}; expansion noted in public history`],
              ["🔥", "Intent", signals.intent],
              ["🧭", "Why prioritized", signals.whyPrioritized],
            ].map(([icon, label, body]) => (
              <div
                key={label}
                className="flex items-center gap-2.5 border-b border-dashed border-border py-2 text-[13px] last:border-b-0"
              >
                <div className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-primary-soft text-[13px]">
                  {icon}
                </div>
                <div>
                  <b>{label}</b> — {body}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p className="mb-2 text-[13px] font-bold">1. Select contacts to push</p>
            {pushable.length === 0 ? (
              <p className="mb-4 text-xs text-muted-foreground italic">
                No contacts available — research found no ICP matches and the account has no
                Salesforce contacts or leads.
              </p>
            ) : (
              <div className="mb-4 flex flex-wrap gap-2.5">
                {pushable.map((p) => {
                  const isSelected = selected.has(p.name);
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => toggleSelected(p.name)}
                      className={`flex items-center gap-2.5 rounded-[11px] border px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary-soft"
                          : "border-border bg-card opacity-70 hover:border-muted-foreground hover:opacity-100"
                      }`}
                    >
                      <span
                        className={`flex size-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "border-[1.5px] border-line text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                        {initials(p.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold">{p.name}</span>
                        <span className="block text-[11.5px] text-muted-foreground">{p.subtitle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="mb-2 text-[13px] font-bold">2. Pick a sequence and push</p>
            <div className="flex flex-wrap items-center gap-3">
            <Combobox.Root
              items={SEQUENCE_GROUPS}
              value={sequence}
              onValueChange={(value: string | null) => {
                if (value) setSequence(value);
              }}
            >
              <Combobox.Trigger className="inline-flex max-w-[340px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-2 text-sm text-foreground hover:border-muted-foreground">
                <Combobox.Value>{(value: string | null) => value ?? "Select a sequence…"}</Combobox.Value>
                <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
              </Combobox.Trigger>
              <Combobox.Portal>
                <Combobox.Positioner className="isolate z-50" sideOffset={4}>
                  <Combobox.Popup className="max-h-[min(24rem,var(--available-height))] w-[340px] origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
                    <Combobox.Input
                      placeholder="Search sequences..."
                      className="mb-1 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring"
                    />
                    <Combobox.Empty className="px-2 py-1.5 text-sm text-muted-foreground">
                      No sequence found.
                    </Combobox.Empty>
                    <Combobox.List>
                      {(group: SequenceGroup) => (
                        <Combobox.Group key={group.value} items={group.items} className="mb-1 last:mb-0">
                          <Combobox.GroupLabel className="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
                            {group.value}
                          </Combobox.GroupLabel>
                          <Combobox.Collection>
                            {(item: string) => (
                              <Combobox.Item
                                key={item}
                                value={item}
                                className="relative flex cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent"
                              >
                                {item}
                                <Combobox.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                                  <CheckIcon className="size-3.5" />
                                </Combobox.ItemIndicator>
                              </Combobox.Item>
                            )}
                          </Combobox.Collection>
                        </Combobox.Group>
                      )}
                    </Combobox.List>
                  </Combobox.Popup>
                </Combobox.Positioner>
              </Combobox.Portal>
            </Combobox.Root>
            <button
              onClick={pushOutreach}
              disabled={selectedCount === 0 || busy === "push"}
              className="rounded-[9px] border border-primary bg-primary px-4 py-2 text-[13.5px] font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-45"
            >
              {busy === "push" ? "Pushing…" : "Push to Outreach"}
            </button>
            <span
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold ${
                selectedCount > 0
                  ? "bg-success-bg text-success"
                  : "bg-warning-bg text-warning"
              }`}
            >
              {selectedCount > 0
                ? `${selectedCount} contact${selectedCount > 1 ? "s" : ""} selected`
                : "Select at least one contact above"}
            </span>
            </div>
          </div>
        )}
      </Card>

      <Card title="Not the right account?" sub="Mark it worked without pushing — logged with a reason">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={notFitReason}
            onChange={(e) => setNotFitReason(e.target.value)}
            className="rounded-[9px] border border-border bg-card px-3 py-2 text-sm text-foreground hover:border-muted-foreground"
          >
            {NOT_A_FIT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            onClick={markNotAFit}
            disabled={busy === "notfit"}
            className="rounded-[9px] border border-destructive bg-transparent px-4 py-2 text-[13.5px] font-semibold text-destructive hover:bg-destructive-bg disabled:opacity-45"
          >
            {busy === "notfit" ? "Marking…" : "Mark “Not a Fit”"}
          </button>
          <span className="text-[12.5px] text-muted-foreground">
            Removes it from today’s worklist — no outreach sent.
          </span>
        </div>
      </Card>
    </>
  );
}
