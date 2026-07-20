"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkabilityResult } from "@/lib/workability/engine";
import type { LeadWorkabilityResult } from "@/lib/leads/types";
import type { AccountScore } from "@/lib/scoring/scoring";
import { AccountDetailView } from "@/components/results/account-detail-view";
import { LeadDetailView } from "@/components/results/lead-detail-view";

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
}

export interface BlockedRow {
  id: string;
  name: string;
  domain: string;
  industry: string;
  type: string;
  blockedBy: string;
}

export interface LeadRow {
  id: string;
  name: string;
  title: string;
  accountName: string | null;
  domain: string | null;
  fit: number;
  intent: number;
  workability: number;
  score: number;
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

export function WorklistExplorer({
  mode,
  demoUserName,
  priorityLabel,
  accountRows = [],
  leadRows = [],
  blockedRows = [],
}: {
  mode: "accounts" | "leads";
  demoUserName: string;
  priorityLabel?: string;
  accountRows?: AccountRow[];
  leadRows?: LeadRow[];
  blockedRows?: BlockedRow[];
}) {
  const [focus, setFocus] = useState<Focus | null>(null);
  // Guards against out-of-order fetches when the focus changes mid-request.
  const seq = useRef(0);

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

  // Deep link on mount: #account-<id> / #lead-<id> focuses that record.
  useEffect(() => {
    const h = parseHash();
    if (h) loadFocus(h.kind, h.id, h.id);
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

  const workableSub =
    mode === "leads"
      ? `SDR leads${priorityLabel ? ` in ${priorityLabel}` : ""}, ranked by “Should I work it?” score`
      : `Ranked by “Should I work it?” score — Fit 40% · Intent 35% · Workability 25%`;

  // ---- Focused record: the worklist steps aside for a single record. ----
  if (focus) {
    return (
      <div id="worklist-focus" className="scroll-mt-20">
        <button
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
              <AccountDetailView
                result={focus.account.result}
                score={focus.account.score}
                demoUserName={demoUserName}
                salesforceUrl={focus.account.salesforceUrl}
              />
            )}
            {!focus.loading && !focus.error && focus.lead && (
              <LeadDetailView
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
      {/* Today's Worklist */}
      <div className="mb-6 rounded-[14px] border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">Today&rsquo;s Worklist</h2>
          <span className="text-[12.5px] text-muted-foreground">{workableSub}</span>
        </div>

        {mode === "leads"
          ? leadRows.length === 0
            ? <div className="px-5 py-4 text-[13px] text-muted-foreground">No leads in this priority group.</div>
            : leadRows.map((lead, i) => (
                <button
                  key={lead.id}
                  onClick={() => openFocus("lead", lead.id, lead.name)}
                  className="flex w-full items-center gap-3.5 border-t border-border px-5 py-3 text-left first:border-t-0 hover:bg-background"
                >
                  <div className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12.5px] font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{lead.name}</div>
                    {lead.accountName && (
                      <div className="text-xs text-muted-foreground">
                        {lead.accountName}
                        {lead.domain ? ` · ${lead.domain}` : ""}
                      </div>
                    )}
                  </div>
                  <div className="hidden items-center gap-2.5 md:flex">
                    <MiniBar label="Fit" value={lead.fit} />
                    <MiniBar label="Intent" value={lead.intent} />
                    <MiniBar label="Work" value={lead.workability} />
                  </div>
                  <div className="w-14 shrink-0 text-center">
                    <b className="text-[17px]">{lead.score}</b>
                  </div>
                </button>
              ))
          : accountRows.map((acct, i) => (
              <button
                key={acct.id}
                onClick={() => openFocus("account", acct.id, acct.name)}
                className="flex w-full items-center gap-3.5 border-t border-border px-5 py-3 text-left first:border-t-0 hover:bg-background"
              >
                <div className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12.5px] font-bold text-primary">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    {acct.name}{" "}
                    {acct.finalStatus === "WORKABLE WITH REVIEW" ? (
                      <span className="ml-1.5 rounded-full bg-warning-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] text-warning uppercase">
                        Review
                      </span>
                    ) : (
                      <span className="ml-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] text-success uppercase">
                        Workable
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {acct.domain} · {acct.industry} · {acct.type}
                  </div>
                </div>
                <div className="hidden items-center gap-2.5 md:flex">
                  <MiniBar label="Fit" value={acct.fit} />
                  <MiniBar label="Intent" value={acct.intent} />
                  <MiniBar label="Work" value={acct.workability} />
                </div>
                <div className="w-14 shrink-0 text-center">
                  <b className="text-[17px]">{acct.priority}</b>
                </div>
              </button>
            ))}
      </div>

      {/* Blocked by de-dupe */}
      <div className="rounded-[14px] border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">Blocked by de-dupe</h2>
          <span className="text-[12.5px] text-muted-foreground">
            Failed one or more of the six checks — open for the evidence
          </span>
        </div>
        {blockedRows.map((acct) => (
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
        ))}
      </div>
    </div>
  );
}
