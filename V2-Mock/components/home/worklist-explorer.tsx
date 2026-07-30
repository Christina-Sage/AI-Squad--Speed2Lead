"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { matchImportIdentifiers } from "@/lib/worklist/import-match";
import type { WorkabilityResult } from "@/lib/workability/engine";
import type { LeadWorkabilityResult } from "@/lib/leads/types";
import type { AccountScore } from "@/lib/scoring/scoring";
import { AccountFocusView } from "@/components/workit/account-focus-view";
import { LeadFocusView } from "@/components/workit/lead-focus-view";
import { SavedWorklistPicker, SavedWorklistBar } from "@/components/home/saved-worklists";
import type { SavedWorklistView } from "@/lib/worklists/saved";

export interface AccountRow {
  id: string;
  name: string;
  domain: string;
  industry: string;
  type: string;
  finalStatus: WorkabilityResult["final_status"];
  fit: number;
  intent: number;
  workability: number;
  priority: number;
  /** Partner (VAR) motion: true when a partner relationship is identified. */
  hasPartner: boolean;
  /** Where the partner relationship was found — drives the channel chip. */
  partnerSource: "Intacct" | "Fusion" | null;
  /** Partner / reseller name for the channel chip, when known. */
  partnerName: string | null;
  /** True for the hotter subset with an active deal registration. */
  partnerRegistered: boolean;
}

export interface BlockedRow {
  id: string;
  name: string;
  domain: string;
  industry: string;
  type: string;
  blockedBy: string;
}

/** A NOT-WORKABLE SDR lead pulled out of the worklist into the blocked list. */
export interface BlockedLeadRow {
  id: string;
  name: string;
  subtitle: string;
  reason: string;
  /** Badge label for the row (e.g. "Duplicate", "Don't work"). Defaults to "Don't work". */
  badge?: string;
}

export interface LeadRow {
  id: string;
  name: string;
  title: string;
  accountId: string | null;
  accountName: string | null;
  domain: string | null;
  fit: number;
  intent: number;
  workability: number;
  score: number;
  /** Lead-level verdict — drives the Workable / Review badge on the row. */
  finalStatus: "WORKABLE" | "WORKABLE WITH REVIEW";
  /** Partner (VAR) motion: true when the lead's account is a partner or it came via a VAR. */
  hasPartner: boolean;
  partnerSource: string | null;
  partnerName: string | null;
  partnerRegistered: boolean;
  /** Id worked-state is recorded under (accountId ?? id) — the saved-list member id. */
  workItId: string;
}

type FocusKind = "account" | "lead";

// A single focused record. The worklist collapses away while this is set;
// clearing it (Back button or browser Back) restores the worklist.
interface Focus {
  kind: FocusKind;
  id: string;
  label: string;
  loading: boolean;
  error: string | null;
  account?: { result: WorkabilityResult; score: AccountScore | null; salesforceUrl?: string };
  lead?: { result: LeadWorkabilityResult; score: AccountScore; salesforceUrl?: string };
}

function hashFor(kind: FocusKind, id: string) {
  return `${kind}-${id}`;
}

function parseHash(): { kind: FocusKind; id: string } | null {
  if (typeof window === "undefined") return null;
  const m = window.location.hash.slice(1).match(/^(account|lead)-(.+)$/);
  return m ? { kind: m[1] as FocusKind, id: m[2] } : null;
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="w-[74px]">
      <div className="flex justify-between text-[10px] tracking-[0.3px] text-muted-foreground">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full border border-border bg-background">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/**
 * Channel chip on an In Review row. It names only the motion (Partner) and the
 * source database — no partner name, no registration state. The database is
 * driven by the product line: the Intacct product line reads its partner data
 * from Intacct; every other product line reads it from Sage Fusion.
 */
function PartnerChip({ hasPartner, product }: { hasPartner: boolean; product: string }) {
  if (!hasPartner) return null;
  const database = product === "Intacct" ? "Intacct" : "Fusion";
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10.5px] font-bold tracking-[0.3px] text-muted-foreground uppercase">
      Partner · {database}
    </span>
  );
}

/** All / Direct / Partner (VAR) segmented control for the BDR accounts worklist. */
function MotionToggle({
  motion,
  setMotion,
  total,
  direct,
  partner,
}: {
  motion: "all" | "direct" | "partner";
  setMotion: (m: "all" | "direct" | "partner") => void;
  total: number;
  direct: number;
  partner: number;
}) {
  const opts: { id: "all" | "direct" | "partner"; label: string; count: number }[] = [
    { id: "all", label: "All", count: total },
    { id: "direct", label: "Direct", count: direct },
    { id: "partner", label: "Partner (VAR)", count: partner },
  ];
  return (
    <div className="inline-flex rounded-[10px] border border-border bg-background p-[3px]">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setMotion(o.id)}
          aria-pressed={motion === o.id}
          className={`inline-flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12.5px] font-semibold ${
            motion === o.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
          <span className="rounded-full border border-border bg-background px-1.5 text-[10.5px] font-bold">
            {o.count}
          </span>
        </button>
      ))}
    </div>
  );
}

export function WorklistExplorer({
  mode,
  team,
  product,
  demoUserName,
  priorityLabel,
  accountRows = [],
  leadRows = [],
  blockedRows = [],
  blockedLeadRows = [],
  workedMap = {},
  justWorkedId = null,
  savedLists = [],
  selectedListId = null,
  worklistAccountIds = [],
}: {
  mode: "accounts" | "leads";
  team: string;
  product: string;
  demoUserName: string;
  priorityLabel?: string;
  accountRows?: AccountRow[];
  leadRows?: LeadRow[];
  blockedRows?: BlockedRow[];
  blockedLeadRows?: BlockedLeadRow[];
  workedMap?: Record<string, "pushed" | "not_fit" | "archived">;
  justWorkedId?: string | null;
  savedLists?: SavedWorklistView[];
  selectedListId?: string | null;
  worklistAccountIds?: string[];
}) {
  const [focus, setFocus] = useState<Focus | null>(null);
  // Guards against out-of-order fetches when the focus changes mid-request.
  const seq = useRef(0);
  // Moves keyboard focus to the record when one opens (a11y).
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const focusedKey = focus ? `${focus.kind}-${focus.id}` : null;

  // List import (paste/CSV) filters Today's Worklist to the matches. It matches
  // whichever worklist the rep is on: accounts for BDR, leads for SDR.
  const [importIds, setImportIds] = useState<Set<string> | null>(null);
  const [importReport, setImportReport] = useState<
    { total: number; matched: number; notFound: string[] } | null
  >(null);
  // Latest rows for the import matcher (the listener is registered once). Kept
  // current via an effect rather than written during render; the listener only
  // fires on user-triggered import events, well after the effect has committed.
  const rowsRef = useRef({ accountRows, blockedRows, leadRows, blockedLeadRows });
  useEffect(() => {
    rowsRef.current = { accountRows, blockedRows, leadRows, blockedLeadRows };
  }, [accountRows, blockedRows, leadRows, blockedLeadRows]);
  const clearImport = useCallback(() => {
    setImportIds(null);
    setImportReport(null);
  }, []);

  // Motion filter (BDR accounts): All / Direct / Partner (VAR). Partner accounts
  // carry a partner relationship (Intacct or Fusion) and are flagged In Review.
  const [motion, setMotion] = useState<"all" | "direct" | "partner">("all");

  const scrollToTop = useCallback(() => {
    requestAnimationFrame(() => {
      const node = document.getElementById("worklist-focus");
      if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  // Loads a record into focus. Does not touch history — callers own that so
  // the hash stays the single source of truth for what's focused.
  const loadFocus = useCallback(
    async (kind: FocusKind, id: string, label: string) => {
      const token = ++seq.current;
      setFocus({ kind, id, label, loading: true, error: null });
      scrollToTop();
      try {
        const url = kind === "account" ? `/api/workability/${id}` : `/api/workability/lead/${id}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        if (seq.current !== token) return; // a newer focus superseded this one
        setFocus((prev) =>
          prev && prev.kind === kind && prev.id === id
            ? {
                ...prev,
                loading: false,
                account:
                  kind === "account"
                    ? { result: data.result, score: data.score, salesforceUrl: data.salesforceUrl }
                    : undefined,
                lead:
                  kind === "lead"
                    ? { result: data.result, score: data.score, salesforceUrl: data.salesforceUrl }
                    : undefined,
              }
            : prev,
        );
      } catch {
        if (seq.current !== token) return;
        setFocus((prev) =>
          prev && prev.kind === kind && prev.id === id
            ? { ...prev, loading: false, error: "Couldn’t load this detail. Try again." }
            : prev,
        );
      }
    },
    [scrollToTop],
  );

  // User-initiated focus (row click, search result). Pushes a hash entry so
  // the browser Back button returns to the worklist.
  const openFocus = useCallback(
    (kind: FocusKind, id: string, label: string) => {
      if (typeof window !== "undefined") {
        window.history.pushState({}, "", `#${hashFor(kind, id)}`);
      }
      loadFocus(kind, id, label);
    },
    [loadFocus],
  );

  // "← Today's Worklist" — strip the hash and restore the worklist.
  const backToWorklist = useCallback(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.pushState({}, "", window.location.pathname + window.location.search);
    }
    seq.current++; // cancel any in-flight fetch
    setFocus(null);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }, []);

  // Search results (from SearchForm) focus in the same view.
  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ kind: FocusKind; id: string; label?: string }>).detail;
      if (!detail?.id) return;
      openFocus(detail.kind, detail.id, detail.label ?? detail.id);
    }
    window.addEventListener("dedupe:open-detail", onOpen as EventListener);
    return () => window.removeEventListener("dedupe:open-detail", onOpen as EventListener);
  }, [openFocus]);

  // List import (from AccountImport): match the identifiers against the active
  // worklist — accounts for BDR, leads for SDR — filter to them, and leave any
  // focused record so the filtered worklist is visible.
  useEffect(() => {
    function onImport(e: Event) {
      const identifiers = (e as CustomEvent<{ identifiers: string[] }>).detail?.identifiers ?? [];
      if (!identifiers.length) return;
      const r = rowsRef.current;
      const rows =
        mode === "leads" ? [...r.leadRows, ...r.blockedLeadRows] : [...r.accountRows, ...r.blockedRows];
      const { matchedIds, report } = matchImportIdentifiers(identifiers, rows);
      setImportIds(matchedIds);
      setImportReport(report);
      if (window.location.hash) {
        window.history.pushState({}, "", window.location.pathname + window.location.search);
      }
      seq.current++;
      setFocus(null);
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
    window.addEventListener("workit:import-accounts", onImport as EventListener);
    return () => window.removeEventListener("workit:import-accounts", onImport as EventListener);
  }, [mode]);

  // Deep link on mount: #account-<id> / #lead-<id> focuses that record.
  // Deferred to a rAF so the loading setState lands after the initial commit
  // (avoids a synchronous setState in the effect body).
  useEffect(() => {
    const h = parseHash();
    if (!h) return;
    const raf = requestAnimationFrame(() => loadFocus(h.kind, h.id, h.id));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser Back/Forward: the hash drives what's focused.
  useEffect(() => {
    function onPop() {
      const h = parseHash();
      if (h) loadFocus(h.kind, h.id, h.id);
      else {
        seq.current++;
        setFocus(null);
      }
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [loadFocus]);

  // When a record opens, move keyboard focus to its Back button so keyboard and
  // screen-reader users land on the new view instead of staying on the row.
  useEffect(() => {
    if (focusedKey) backBtnRef.current?.focus();
  }, [focusedKey]);

  // Make the workflow separation explicit: BDR works accounts/contacts, SDR
  // works leads — always within the one selected product line.
  const unitOfWork = mode === "leads" ? "Leads" : "Accounts & contacts";
  const workflowLabel = `${team} · ${product} · ${unitOfWork}`;
  const workableSub =
    mode === "leads"
      ? `Ranked by “Should I work it?” score${priorityLabel ? ` · ${priorityLabel}` : ""}`
      : `Ranked by “Should I work it?” score — Fit 40% · Intent 35% · Workability 25%`;

  // Worked-state. Worked rows keep their DOM position (we map the row props
  // directly — mapping a derived array trips the compiler's ref rule on the row
  // click handler) but sink to the bottom visually via CSS `order`, and unworked
  // rows re-rank 1..N. A lead counts worked if it — or its linked account — was
  // worked today (working the account works the lead).
  const leadOutcome = (l: LeadRow): "pushed" | "not_fit" | "archived" | undefined =>
    workedMap[l.id] ?? (l.accountId ? workedMap[l.accountId] : undefined);
  const outcomeLabel = (o: "pushed" | "not_fit" | "archived") =>
    o === "pushed" ? "Worked · Pushed" : o === "archived" ? "Worked · Archived" : "Worked · Not a fit";

  // An active import filters the active worklist to the matched ids — accounts
  // for BDR, leads for SDR.
  const importActive = importIds !== null;
  const selectedList = selectedListId
    ? savedLists.find((l) => l.id === selectedListId) ?? null
    : null;
  const acctVisible = (id: string) => !importActive || importIds!.has(id);
  // Motion filter is layered on top of the import filter. Partner (VAR) counts
  // are taken before the motion filter so the toggle always shows the full split.
  const motionPool = accountRows.filter((a) => acctVisible(a.id));
  const partnerCount = motionPool.filter((a) => a.hasPartner).length;
  const directCount = motionPool.length - partnerCount;
  const motionMatch = (a: AccountRow) =>
    motion === "all" || (motion === "partner" ? a.hasPartner : !a.hasPartner);
  const acctInView = (a: AccountRow) => acctVisible(a.id) && motionMatch(a);
  const visibleAcctCount = motionPool.filter(motionMatch).length;
  const leadVisible = (id: string) => !importActive || importIds!.has(id);
  // Motion filter for the SDR lead worklist mirrors the account side: a lead is
  // Partner when its account is a partner or it came in through a VAR.
  const leadMotionMatch = (l: LeadRow) =>
    motion === "all" || (motion === "partner" ? l.hasPartner : !l.hasPartner);
  const leadInView = (l: LeadRow) => leadVisible(l.id) && leadMotionMatch(l);
  const leadPool = leadRows.filter((l) => leadVisible(l.id));
  const leadPartnerCount = leadPool.filter((l) => l.hasPartner).length;
  const leadDirectCount = leadPool.length - leadPartnerCount;
  const visibleLeadCount = leadPool.filter(leadMotionMatch).length;

  const unworkedAccts = accountRows.filter((a) => !workedMap[a.id] && acctInView(a));
  const rankById = new Map(unworkedAccts.map((a, i) => [a.id, i + 1]));
  const unworkedLeads = leadRows.filter((l) => !leadOutcome(l) && leadInView(l));
  const leadRankById = new Map(unworkedLeads.map((l, i) => [l.id, i + 1]));

  const isLeads = mode === "leads";
  const activeTotal = isLeads ? visibleLeadCount : visibleAcctCount;
  const activeWorkedCount = activeTotal - (isLeads ? unworkedLeads.length : unworkedAccts.length);

  // Motion toggle + saved-list controls are team-aware: accounts for BDR, leads
  // for SDR. The unit word keeps the copy honest in either mode.
  const ctlTotal = isLeads ? leadPool.length : motionPool.length;
  const ctlDirect = isLeads ? leadDirectCount : directCount;
  const ctlPartner = isLeads ? leadPartnerCount : partnerCount;
  const unitWord = isLeads ? "leads" : "accounts";
  // Saved-list membership uses the id worked-state is recorded under: account id
  // for BDR, workItId (accountId ?? leadId) for SDR leads.
  const saveAccountIds = isLeads
    ? importActive
      ? leadRows.filter((l) => importIds!.has(l.id)).map((l) => l.workItId)
      : worklistAccountIds
    : importActive
      ? [...importIds!]
      : worklistAccountIds;

  // "Next up" banner after working a record. justWorkedId is an account id (or a
  // lead id for freemail leads); match it to the active list to name it.
  const justWorkedName = !justWorkedId
    ? null
    : isLeads
      ? leadRows.find((l) => (l.id === justWorkedId || l.accountId === justWorkedId) && leadOutcome(l))?.name ??
        null
      : (workedMap[justWorkedId] ? accountRows.find((a) => a.id === justWorkedId)?.name ?? null : null);
  const justWorkedOutcome = !justWorkedId
    ? undefined
    : isLeads
      ? leadOutcome(leadRows.find((l) => l.id === justWorkedId || l.accountId === justWorkedId) ?? ({} as LeadRow))
      : workedMap[justWorkedId];
  const nextUpName = (isLeads ? unworkedLeads[0] : unworkedAccts[0])?.name ?? null;

  // ---- Focused record: the worklist steps aside for a single record. ----
  if (focus) {
    return (
      <div id="worklist-focus" className="scroll-mt-20">
        <button
          ref={backBtnRef}
          onClick={backToWorklist}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-semibold hover:border-muted-foreground"
        >
          ← Today&rsquo;s Worklist
        </button>

        <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-[0.5px] uppercase ${
                focus.kind === "lead" ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {focus.kind}
            </span>
            <span className="truncate font-heading text-[15px] font-black">{focus.label}</span>
          </div>

          <div className="p-5">
            {focus.loading && (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <span className="size-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                Analyzing…
              </div>
            )}
            {focus.error && <div className="py-6 text-sm text-destructive">{focus.error}</div>}
            {!focus.loading && !focus.error && focus.account && (
              <AccountFocusView
                result={focus.account.result}
                score={focus.account.score}
                demoUserName={demoUserName}
                salesforceUrl={focus.account.salesforceUrl}
              />
            )}
            {!focus.loading && !focus.error && focus.lead && (
              <LeadFocusView
                result={focus.lead.result}
                score={focus.lead.score}
                salesforceUrl={focus.lead.salesforceUrl}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Worklist (default). ----
  return (
    <div id="worklist-focus" className="scroll-mt-20">
      {importActive && (
        <div className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[12px] border border-primary/40 bg-primary-soft px-4 py-2.5 text-[13px]">
          <span className="font-heading font-black text-primary">Imported list</span>
          <span className="text-muted-foreground">
            Showing {importReport?.matched ?? 0} of {importReport?.total ?? 0} identifier
            {(importReport?.total ?? 0) === 1 ? "" : "s"}
            {importReport && importReport.notFound.length > 0 && (
              <>
                {" "}
                · {importReport.notFound.length} not found:{" "}
                {importReport.notFound.slice(0, 5).join(", ")}
                {importReport.notFound.length > 5 ? "…" : ""}
              </>
            )}
          </span>
          <span className="flex-1" />
          <button
            onClick={clearImport}
            className="rounded-[9px] border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold hover:border-muted-foreground"
          >
            Clear import
          </button>
        </div>
      )}
      {/* Today's Worklist */}
      <div className="mb-6 rounded-[14px] border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">Today&rsquo;s Worklist</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-[0.4px] uppercase ${
              mode === "leads" ? "bg-primary-soft text-primary" : "bg-muted text-foreground"
            }`}
          >
            {workflowLabel}
          </span>
          <span className="text-[12.5px] text-muted-foreground">{workableSub}</span>
          {activeTotal > 0 && (
            <span className="ml-auto text-[12.5px] font-semibold text-muted-foreground">
              {activeWorkedCount} of {activeTotal} worked
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <MotionToggle
            motion={motion}
            setMotion={setMotion}
            total={ctlTotal}
            direct={ctlDirect}
            partner={ctlPartner}
          />
          <SavedWorklistPicker
            savedLists={savedLists}
            selectedListId={selectedListId}
            saveAccountIds={saveAccountIds}
          />
          <span className="text-[12px] text-muted-foreground">
            {ctlPartner > 0
              ? `${ctlPartner} In Review (~${Math.round(
                  (ctlPartner / (ctlTotal || 1)) * 100,
                )}%) — partner relationship`
              : `No partner ${unitWord} in this view`}
          </span>
        </div>

        {selectedList && <SavedWorklistBar list={selectedList} />}

        {justWorkedName && (
          <div className="flex items-center gap-2.5 border-b border-border bg-primary-soft px-5 py-3 text-[13px]">
            <span className="font-heading text-[15px] font-black text-primary">✓</span>
            <div>
              <b>{justWorkedName}</b> worked —{" "}
              {justWorkedOutcome === "not_fit"
                ? "marked Not a Fit"
                : justWorkedOutcome === "archived"
                  ? "archived"
                  : "pushed to Outreach"}
              .{" "}
              {nextUpName ? (
                <>
                  Next up: <b>{nextUpName}</b>.
                </>
              ) : (
                "That’s everyone on your list — nice work."
              )}
            </div>
          </div>
        )}

        {isLeads
          ? visibleLeadCount === 0
            ? <div className="px-5 py-4 text-[13px] text-muted-foreground">
                {importActive
                  ? "None of the imported leads are in the current worklist. Check the “not found” list above, or clear the import."
                  : motion === "partner"
                    ? "No partner (VAR) leads in this worklist."
                    : motion === "direct"
                      ? "No direct leads in this worklist."
                      : leadRows.length === 0
                        ? "No leads in this priority group."
                        : "No leads in this view."}
              </div>
            : (
              <div className="flex flex-col">
                {leadRows.map((lead) => {
                  if (!leadInView(lead)) return null;
                  return (
                  <button
                    key={lead.id}
                    onClick={() => openFocus("lead", lead.id, lead.name)}
                    style={{ order: leadOutcome(lead) ? 1 : 0 }}
                    className={`flex w-full items-center gap-3.5 border-t border-border px-5 py-3 text-left hover:bg-background ${
                      leadOutcome(lead) ? "opacity-55 hover:opacity-100" : ""
                    }`}
                  >
                    <div
                      className={`flex size-[26px] shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold ${
                        leadOutcome(lead) ? "bg-success-bg text-success" : "bg-primary-soft text-primary"
                      }`}
                    >
                      {leadOutcome(lead) ? "✓" : leadRankById.get(lead.id)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">
                        {lead.name}
                        {!leadOutcome(lead) && (
                          <span
                            className={`ml-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] uppercase ${
                              lead.finalStatus === "WORKABLE WITH REVIEW"
                                ? "bg-warning-bg text-warning"
                                : "bg-success-bg text-success"
                            }`}
                          >
                            {lead.finalStatus === "WORKABLE WITH REVIEW" ? "In Review" : "Workable"}
                          </span>
                        )}
                        {!leadOutcome(lead) && (
                          <PartnerChip hasPartner={lead.hasPartner} product={product} />
                        )}
                      </div>
                      {lead.accountName && (
                        <div className="text-xs text-muted-foreground">
                          {lead.accountName}
                          {lead.domain ? ` · ${lead.domain}` : ""}
                        </div>
                      )}
                    </div>
                    {leadOutcome(lead) ? (
                      <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] text-success uppercase">
                        {outcomeLabel(leadOutcome(lead)!)}
                      </span>
                    ) : (
                      <>
                        <div className="hidden items-center gap-2.5 md:flex">
                          <MiniBar label="Fit" value={lead.fit} />
                          <MiniBar label="Intent" value={lead.intent} />
                          <MiniBar label="Work" value={lead.workability} />
                        </div>
                        <div className="w-14 shrink-0 text-center">
                          <b className="text-[17px]">{lead.score}</b>
                        </div>
                      </>
                    )}
                  </button>
                  );
                })}
              </div>
            )
          : visibleAcctCount === 0
            ? <div className="px-5 py-4 text-[13px] text-muted-foreground">
                {importActive
                  ? "None of the imported accounts are in the current worklist. Check the “not found” list above, or clear the import."
                  : motion === "partner"
                    ? "No partner (VAR) accounts in this worklist."
                    : motion === "direct"
                      ? "No direct accounts in this worklist."
                      : "No accounts in this worklist."}
              </div>
            : (
            <div className="flex flex-col">
              {accountRows.map((acct) => {
                if (!acctInView(acct)) return null;
                return (
                <button
                  key={acct.id}
                  onClick={() => openFocus("account", acct.id, acct.name)}
                  style={{ order: workedMap[acct.id] ? 1 : 0 }}
                  className={`flex w-full items-center gap-3.5 border-t border-border px-5 py-3 text-left hover:bg-background ${
                    workedMap[acct.id] ? "opacity-55 hover:opacity-100" : ""
                  }`}
                >
                  <div
                    className={`flex size-[26px] shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold ${
                      workedMap[acct.id] ? "bg-success-bg text-success" : "bg-primary-soft text-primary"
                    }`}
                  >
                    {workedMap[acct.id] ? "✓" : rankById.get(acct.id)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {acct.name}{" "}
                      {acct.finalStatus === "WORKABLE WITH REVIEW" ? (
                        <span className="ml-1.5 rounded-full bg-warning-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] text-warning uppercase">
                          In Review
                        </span>
                      ) : (
                        <span className="ml-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] text-success uppercase">
                          Workable
                        </span>
                      )}
                      <PartnerChip hasPartner={acct.hasPartner} product={product} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {acct.domain} · {acct.industry} · {acct.type}
                    </div>
                  </div>
                  {workedMap[acct.id] ? (
                    <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] text-success uppercase">
                      {outcomeLabel(workedMap[acct.id]!)}
                    </span>
                  ) : (
                    <>
                      <div className="hidden items-center gap-2.5 md:flex">
                        <MiniBar label="Fit" value={acct.fit} />
                        <MiniBar label="Intent" value={acct.intent} />
                        <MiniBar label="Work" value={acct.workability} />
                      </div>
                      <div className="w-14 shrink-0 text-center">
                        <b className="text-[17px]">{acct.priority}</b>
                      </div>
                    </>
                  )}
                </button>
                );
              })}
            </div>
          )}
      </div>

      {/* Blocked by de-dupe */}
      <div className="rounded-[14px] border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">Blocked by de-dupe</h2>
          <span className="text-[12.5px] text-muted-foreground">
            Failed one or more of the six checks — open for the evidence
          </span>
        </div>
        {mode === "leads" &&
          blockedLeadRows.map((lead) => {
            if (!leadVisible(lead.id)) return null;
            return (
            <button
              key={lead.id}
              onClick={() => openFocus("lead", lead.id, lead.name)}
              className="flex w-full items-center gap-3.5 border-t border-border px-5 py-3 text-left opacity-60 first:border-t-0 hover:bg-background hover:opacity-100"
            >
              <div className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-background text-[12.5px] font-bold text-muted-foreground">
                ✗
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">
                  {lead.name}{" "}
                  <span className="ml-1.5 rounded-full bg-destructive-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] text-destructive uppercase">
                    {lead.badge ?? "Don’t work"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{lead.subtitle}</div>
              </div>
              <div className="text-[11.5px] text-destructive">{lead.reason}</div>
            </button>
            );
          })}
        {mode === "accounts" &&
          blockedRows.map((acct) => {
          if (!acctVisible(acct.id)) return null;
          return (
          <button
            key={acct.id}
            onClick={() => openFocus("account", acct.id, acct.name)}
            className="flex w-full items-center gap-3.5 border-t border-border px-5 py-3 text-left opacity-60 first:border-t-0 hover:bg-background hover:opacity-100"
          >
            <div className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-background text-[12.5px] font-bold text-muted-foreground">
              ✗
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">
                {acct.name}{" "}
                <span className="ml-1.5 rounded-full bg-destructive-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] text-destructive uppercase">
                  Don&rsquo;t work
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {acct.domain} · {acct.industry} · {acct.type}
              </div>
            </div>
            <div className="text-[11.5px] text-destructive">{acct.blockedBy}</div>
          </button>
          );
        })}
      </div>
    </div>
  );
}
