"use client";

import { useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { buildAccountNote } from "@/lib/workit/account-note";
import type { HygieneSuggestion } from "@/lib/workit/hygiene";
import { SEQUENCE_GROUPS, type OutreachPush, type SequenceGroup } from "@/lib/outreach";
import { NOT_A_FIT_REASONS } from "@/lib/workit/not-a-fit";
import { classifyIcpRole, type IcpRole } from "@/lib/research/icp";
import { buildSalesforceNewContactUrl } from "@/lib/salesforce/urls";
import { OutreachProspectPanel, type OutreachProspect } from "@/components/workit/outreach-prospect-panel";

/** Best-effort work email from a person's name + company domain (mock only). */
function deriveEmail(name: string, domain?: string): string | null {
  if (!domain) return null;
  const parts = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return null;
  const local = parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
  return `${local}@${domain}`;
}

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

/**
 * 6Sense / growth signals the rep pastes into Outreach. Optional — only the
 * account work-it path resolves the full 6Sense breakdown; leads pass what they
 * have and the note degrades gracefully.
 */
export interface OutreachNoteSignals {
  /** 6Sense trending research keywords. */
  sixSenseKeywords: string[];
  /** 6Sense de-anonymized website-visit summary. */
  websiteVisits: string;
  /** 6Sense buying-stage reading — the intent trigger. */
  buyingStage: string;
  /** Growth signals (new hires, locations, expansion). */
  growthSignals: string[];
}

/** ZoomInfo enrichment the rep pastes into Outreach. */
export interface ZoomInfoNoteSignals {
  /** Related / installed technologies detected by ZoomInfo. */
  technologies: string[];
  /** Active ZoomInfo Intent topics. */
  intentTopics: string[];
  /** De-anonymized website sightings (WebSights) summary. */
  webSightings: string | null;
}

export interface PanelSignals {
  revenue: string;
  fte: string;
  source: string;
  intent: string;
  whyPrioritized: string;
  /** 6Sense + growth signals, grouped under "Outreach" in the copy note. */
  outreach?: OutreachNoteSignals;
  /** ZoomInfo technographics / intent / WebSights, grouped in the copy note. */
  zoomInfo?: ZoomInfoNoteSignals;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
}

/** One row in the Existing Contacts table. */
interface ContactRow {
  name: string;
  title: string;
  role: IcpRole | null;
  /** Already a Salesforce record on file (auto-confirmed) vs. a new research find. */
  matched: boolean;
  /** Secondary label for the Push chip: "Contact" / "Lead" / "Website" / "Form 990". */
  detail: string;
}

function RolePill({ role }: { role: IcpRole }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/40 px-2 py-0.5 text-[10.5px] font-bold tracking-[0.4px] text-primary uppercase">
      {role}
    </span>
  );
}

function ConfirmedPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-[11.5px] font-bold text-success">
      ✓ Confirmed
    </span>
  );
}

function ReviewPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-bg px-2.5 py-0.5 text-[11.5px] font-bold text-warning">
      ⚠ Needs your review
    </span>
  );
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
  accountName,
  domain,
  industry,
  foundContacts,
  existingRecords,
  hygiene,
  sequences,
  signals,
  initialAppliedFields,
  initialAddedNames,
  initialPush,
  lead,
}: {
  accountId: string;
  accountName?: string;
  domain?: string;
  industry?: string;
  foundContacts: PanelContact[];
  existingRecords: PanelExistingRecord[];
  hygiene: HygieneSuggestion[];
  sequences: string[];
  signals: PanelSignals;
  initialAppliedFields: string[];
  initialAddedNames: string[];
  initialPush: OutreachPush | null;
  /**
   * SDR-lead mode. When set, the lead itself is the unit of work: the Existing
   * Contacts card is hidden and the lead is the single, pre-selected contact to
   * push to Outreach (no account-contact confirm/review flow).
   */
  lead?: { name: string; title?: string | null; email?: string | null };
}) {
  const toast = useToast();

  // Unified list for the Existing Contacts card: Salesforce records already on
  // file (auto-confirmed) + new research finds that need review before pushing.
  // Empty in lead mode — the card is hidden and the lead is what gets pushed.
  const contactRows: ContactRow[] = lead
    ? []
    : [
        ...existingRecords.map((r) => ({
          name: r.name,
          title: r.title,
          role: classifyIcpRole(r.title),
          matched: true,
          detail: r.kind,
        })),
        ...foundContacts
          .filter((c) => !c.inSalesforce)
          .map((c) => ({
            name: c.name,
            title: c.title,
            role: classifyIcpRole(c.title),
            matched: false,
            detail: c.source === "990" ? "Form 990" : "Website",
          })),
      ];
  const initialConfirmed = new Set<string>(
    lead
      ? [lead.name.toLowerCase()]
      : [
          ...existingRecords.map((r) => r.name.toLowerCase()),
          ...initialAddedNames.map((n) => n.toLowerCase()),
        ],
  );

  // Matched records + already-added finds are confirmed and pre-selected; a new
  // find stays locked (unselectable) until the rep confirms it. In lead mode the
  // lead is the confirmed, pre-selected target.
  const [confirmed, setConfirmed] = useState<Set<string>>(() => new Set(initialConfirmed));
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        lead
          ? [lead.name]
          : contactRows
              .filter((row) => initialConfirmed.has(row.name.toLowerCase()))
              .map((row) => row.name),
      ),
  );
  const [applied, setApplied] = useState<Set<string>>(() => new Set(initialAppliedFields));
  const [push, setPush] = useState<OutreachPush | null>(initialPush);
  const [sequence, setSequence] = useState(sequences[0]);
  const [notFitReason, setNotFitReason] = useState(NOT_A_FIT_REASONS[0]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  // The simulated Outreach prospect panel, opened right after a successful push.
  const [outreachPanel, setOutreachPanel] = useState<{
    prospects: OutreachProspect[];
    sequence: string;
  } | null>(null);

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

  const isConfirmed = (name: string) => confirmed.has(name.toLowerCase());

  function toggleSelected(name: string) {
    if (!isConfirmed(name)) return; // locked until confirmed
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Confirm a new research find: writes it to Salesforce (as before), then marks
  // it confirmed and selects it so it flows into the Push to Outreach list.
  async function confirmContact(row: ContactRow) {
    setBusy(row.name);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, name: row.name, title: row.title }),
      });
      const data = await res.json();
      if (!data.success) {
        toast(data.error ?? "Failed to confirm contact");
        return;
      }
      setConfirmed((prev) => new Set(prev).add(row.name.toLowerCase()));
      setSelected((prev) => new Set(prev).add(row.name));
      toast(`Confirmed — added to Salesforce: ${row.name}`);
    } catch {
      toast("Failed to confirm contact");
    } finally {
      setBusy(null);
    }
  }

  const confirmedRows = contactRows.filter((row) => isConfirmed(row.name));
  const reviewCount = contactRows.length - confirmedRows.length;
  const selectedContactCount = contactRows.filter((row) => selected.has(row.name)).length;
  const allConfirmedSelected =
    confirmedRows.length > 0 && confirmedRows.every((row) => selected.has(row.name));

  function toggleAllContacts() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allConfirmedSelected) confirmedRows.forEach((row) => next.delete(row.name));
      else confirmedRows.forEach((row) => next.add(row.name));
      return next;
    });
  }

  // What can enter a sequence. In lead mode it's just the lead; otherwise the
  // confirmed contacts from the Existing Contacts card above.
  const pushable: { name: string; subtitle: string }[] = lead
    ? [{ name: lead.name, subtitle: lead.title ? `${lead.title} · Lead` : "Lead" }]
    : confirmedRows.map((row) => ({
        name: row.name,
        subtitle: `${row.title} · ${row.matched ? "In SFDC" : row.detail}`,
      }));

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
        `${names.length} contact${names.length > 1 ? "s" : ""} added to “${sequence}” in Outreach`,
      );
      // Open the simulated Outreach prospect panel listing every pushed contact.
      const prospects: OutreachProspect[] = names.map((name) => {
        const contact = foundContacts.find((c) => c.name === name);
        const record = existingRecords.find((r) => r.name === name);
        const isLead = lead?.name === name;
        return {
          name,
          title: contact?.title ?? record?.title ?? (isLead ? (lead?.title ?? null) : null),
          company: accountName ?? null,
          email: (isLead ? lead?.email : null) ?? deriveEmail(name, domain),
        };
      });
      setOutreachPanel({ prospects, sequence });
      setBusy(null);
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

  const accountNote = buildAccountNote({
    accountName: accountName ?? "This account",
    industry,
    signals,
  });

  async function copyNote() {
    try {
      await navigator.clipboard.writeText(accountNote.text);
      toast("Summary notes copied — paste into Outreach");
    } catch {
      toast("Couldn’t copy to clipboard");
    }
  }

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

      {!lead && (
      <Card title="Existing Contacts" sub="ICP contacts, checked against Salesforce">
        {contactRows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No Salesforce contacts on file and no ICP matches found in research.
          </p>
        ) : (
          <>
            <div className="mb-4 flex items-start gap-2.5 rounded-[11px] border border-success-bg bg-success-soft px-4 py-2.5">
              <span className="mt-px flex size-[20px] shrink-0 items-center justify-center rounded-full bg-success-bg text-[12px] font-extrabold text-success">
                ✓
              </span>
              <p className="text-[12.5px] leading-snug">
                Checked Salesforce on <b>{accountName ?? "this account"}</b> — {confirmedRows.length}{" "}
                ICP contact{confirmedRows.length === 1 ? "" : "s"} confirmed and pre-selected.
                {reviewCount > 0 ? (
                  <>
                    {" "}
                    <span className="font-semibold text-warning">
                      {reviewCount} {reviewCount === 1 ? "needs" : "need"} your review
                    </span>{" "}
                    ({reviewCount === 1 ? "a new contact that doesn’t" : "new contacts that don’t"}{" "}
                    match an existing record).
                  </>
                ) : (
                  " All checked against Salesforce — none need review."
                )}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-[11px] font-bold tracking-[0.5px] text-muted-foreground uppercase">
                    <th className="w-9 py-2 pr-2 font-bold">
                      <input
                        type="checkbox"
                        aria-label="Select all confirmed contacts"
                        className="size-4 accent-success align-middle"
                        checked={allConfirmedSelected}
                        onChange={toggleAllContacts}
                      />
                    </th>
                    <th className="py-2 pr-3 font-bold">Contact</th>
                    <th className="py-2 pr-3 font-bold">Title</th>
                    <th className="py-2 pr-3 font-bold">ICP Role</th>
                    <th className="py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contactRows.map((row) => {
                    const conf = isConfirmed(row.name);
                    return (
                      <tr
                        key={`${row.name}-${row.title}`}
                        className={`border-b border-border last:border-b-0 ${conf ? "" : "bg-warning-bg/20"}`}
                      >
                        <td className="py-3 pr-2 align-top">
                          <input
                            type="checkbox"
                            aria-label={`Select ${row.name}`}
                            className="size-4 accent-success align-middle disabled:opacity-40"
                            checked={selected.has(row.name)}
                            disabled={!conf}
                            onChange={() => toggleSelected(row.name)}
                          />
                        </td>
                        <td className="py-3 pr-3 align-top text-[13.5px] font-semibold">{row.name}</td>
                        <td className="py-3 pr-3 align-top text-[13px] text-muted-foreground">
                          {row.title}
                        </td>
                        <td className="py-3 pr-3 align-top">
                          {row.role && <RolePill role={row.role} />}
                        </td>
                        <td className="py-3 align-top">
                          {conf ? (
                            <div>
                              <ConfirmedPill />
                              <p className="mt-1 text-[11.5px] text-muted-foreground">
                                {row.matched
                                  ? `Matched Salesforce ${row.detail.toLowerCase()}`
                                  : "Confirmed — added to Salesforce"}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <ReviewPill />
                                <a
                                  href={buildSalesforceNewContactUrl(accountId, row.name, row.title)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-[7px] border border-border bg-card px-2.5 py-1 text-[12.5px] font-semibold text-link hover:border-muted-foreground"
                                >
                                  Add in Salesforce
                                  <ExternalLinkIcon className="size-3.5" />
                                </a>
                                <button
                                  type="button"
                                  className="rounded-[7px] border border-warning bg-card px-2.5 py-1 text-[12.5px] font-semibold text-warning hover:brightness-95 disabled:opacity-45"
                                  disabled={busy === row.name}
                                  onClick={() => confirmContact(row)}
                                >
                                  {busy === row.name ? "Syncing…" : "Confirm & add"}
                                </button>
                              </div>
                              <p className="mt-1 max-w-[340px] text-[11.5px] text-muted-foreground">
                                New contact from research — not in Salesforce yet. Open{" "}
                                <b>Add in Salesforce</b> to create the record on this account, then{" "}
                                <b>Confirm &amp; add</b> to sync it and confirm it landed.
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 border-t border-border pt-3 text-[12.5px] text-muted-foreground">
              <b className="text-foreground">{selectedContactCount}</b> selected · added to the Push
              to Outreach list below
              {reviewCount > 0 && (
                <>
                  {" "}
                  · <b className="text-warning">{reviewCount}</b> awaiting review
                </>
              )}
            </div>
          </>
        )}
      </Card>
      )}

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

            <div className="mb-4 rounded-[11px] border border-border">
              <button
                type="button"
                onClick={() => setNotesOpen((v) => !v)}
                aria-expanded={notesOpen}
                className="flex w-full items-center gap-2 rounded-[11px] px-3.5 py-2.5 text-left hover:bg-primary-soft"
              >
                <span className="flex items-center gap-1.5 text-[13px] font-bold">
                  🗒️ Account summary notes
                </span>
                {!notesOpen && (
                  <span className="text-[12px] font-medium text-muted-foreground">· expand to copy</span>
                )}
                <span className="flex-1" />
                <ChevronDownIcon
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${notesOpen ? "rotate-180" : ""}`}
                />
              </button>
              {notesOpen && (
                <div className="border-t border-border p-3.5">
                  <div className="mb-2.5 flex justify-end">
                    <button
                      type="button"
                      onClick={copyNote}
                      className="inline-flex items-center gap-1.5 rounded-[8px] border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold hover:border-muted-foreground"
                    >
                      <CopyIcon className="size-3.5" />
                      Copy for Outreach
                    </button>
                  </div>
                  <div className="rounded-[10px] border border-border bg-background p-4 text-[13px]">
                    <div className="mb-2.5 border-b border-border pb-2 text-[11.5px] tracking-[0.3px] text-muted-foreground">
                      {accountNote.meta}
                    </div>
                    {accountNote.sections.map((s) => (
                      <div key={s.title} className="mb-3 last:mb-0">
                        <h4 className="mb-1 text-[12px] font-extrabold tracking-[0.3px]">{s.title}</h4>
                        <ul className="list-disc pl-[18px]">
                          {s.lines.map((l, i) => (
                            <li key={i} className="my-0.5">
                              {l}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
                  <Combobox.Popup className="flex max-h-72 w-[340px] flex-col origin-(--transform-origin) rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
                    <Combobox.Input
                      placeholder="Search sequences..."
                      className="mb-1 w-full shrink-0 rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring"
                    />
                    <Combobox.Empty className="px-2 py-1.5 text-sm text-muted-foreground">
                      No sequence found.
                    </Combobox.Empty>
                    <Combobox.List className="min-h-0 flex-1 overflow-y-auto">
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

      {outreachPanel && (
        <OutreachProspectPanel
          prospects={outreachPanel.prospects}
          sequence={outreachPanel.sequence}
          onClose={() => returnToWorklist(accountId)}
        />
      )}
    </>
  );
}
