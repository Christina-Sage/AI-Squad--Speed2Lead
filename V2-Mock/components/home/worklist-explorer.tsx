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

type PanelKind = "account" | "lead";

interface Panel {
  key: string;
  kind: PanelKind;
  id: string;
  label: string;
  collapsed: boolean;
  loading: boolean;
  error: string | null;
  account?: { result: WorkabilityResult; score: AccountScore | null; salesforceUrl?: string };
  lead?: { result: LeadWorkabilityResult; score: AccountScore; salesforceUrl?: string };
}

function hashFor(kind: PanelKind, id: string) {
  return `${kind}-${id}`;
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
  const [panels, setPanels] = useState<Panel[]>([]);
  const panelsRef = useRef<Panel[]>([]);
  panelsRef.current = panels;
  const seq = useRef(0);

  const scrollToPanel = useCallback((key: string) => {
    requestAnimationFrame(() => {
      const node = document.getElementById(`panel-${key}`);
      if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const openPanel = useCallback(
    async (kind: PanelKind, id: string, label: string, pushHash: boolean) => {
      // If already open, just scroll to it.
      const existing = panelsRef.current.find((p) => p.kind === kind && p.id === id);
      if (existing) {
        scrollToPanel(existing.key);
        return;
      }

      const key = `${kind}-${id}-${++seq.current}`;
      const panel: Panel = { key, kind, id, label, collapsed: false, loading: true, error: null };
      setPanels((prev) => [...prev, panel]);
      if (pushHash && typeof window !== "undefined") {
        window.history.pushState({ panelKey: key }, "", `#${hashFor(kind, id)}`);
      }
      scrollToPanel(key);

      try {
        const url = kind === "account" ? `/api/workability/${id}` : `/api/workability/lead/${id}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        setPanels((prev) =>
          prev.map((p) =>
            p.key === key
              ? {
                  ...p,
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
              : p,
          ),
        );
      } catch {
        setPanels((prev) =>
          prev.map((p) =>
            p.key === key ? { ...p, loading: false, error: "Couldn’t load this detail. Try again." } : p,
          ),
        );
      }
    },
    [scrollToPanel],
  );

  // Search results (from SearchForm) open inline in the same feed.
  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ kind: PanelKind; id: string; label?: string }>).detail;
      if (!detail?.id) return;
      openPanel(detail.kind, detail.id, detail.label ?? detail.id, true);
    }
    window.addEventListener("dedupe:open-detail", onOpen as EventListener);
    return () => window.removeEventListener("dedupe:open-detail", onOpen as EventListener);
  }, [openPanel]);

  // Deep link on mount: #account-<id> / #lead-<id> opens that panel.
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const m = hash.match(/^(account|lead)-(.+)$/);
    if (m) openPanel(m[1] as PanelKind, m[2], m[2], false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back button removes the most recently opened panel rather than wiping the feed.
  useEffect(() => {
    function onPop() {
      setPanels((prev) => (prev.length ? prev.slice(0, -1) : prev));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function toggleCollapse(key: string) {
    setPanels((prev) => prev.map((p) => (p.key === key ? { ...p, collapsed: !p.collapsed } : p)));
  }
  function removePanel(key: string) {
    setPanels((prev) => prev.filter((p) => p.key !== key));
  }
  function clearAll() {
    setPanels([]);
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.pushState({}, "", window.location.pathname + window.location.search);
    }
  }

  const workableSub =
    mode === "leads"
      ? `SDR leads${priorityLabel ? ` in ${priorityLabel}` : ""}, ranked by “Should I work it?” score`
      : `Ranked by “Should I work it?” score — Fit 40% · Intent 35% · Workability 25%`;

  return (
    <div>
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
                  onClick={() => openPanel("lead", lead.id, lead.name, true)}
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
                onClick={() => openPanel("account", acct.id, acct.name, true)}
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
            onClick={() => openPanel("account", acct.id, acct.name, true)}
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

      {/* Inline stacked detail feed */}
      {panels.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-[15.5px] font-semibold">
              {panels.length} opened {panels.length === 1 ? "detail" : "details"}
            </h2>
            <span className="flex-1" />
            <button
              onClick={clearAll}
              className="rounded-[9px] border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold hover:border-muted-foreground"
            >
              Clear all
            </button>
          </div>

          {panels.map((panel) => (
            <div
              key={panel.key}
              id={`panel-${panel.key}`}
              className="mb-5 scroll-mt-20 overflow-hidden rounded-[14px] border border-border bg-card shadow-sm"
            >
              <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-[0.5px] uppercase ${
                    panel.kind === "lead"
                      ? "bg-primary-soft text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {panel.kind}
                </span>
                <span className="truncate font-heading text-[15px] font-black">{panel.label}</span>
                <span className="flex-1" />
                <button
                  onClick={() => toggleCollapse(panel.key)}
                  aria-label={panel.collapsed ? "Expand" : "Collapse"}
                  className="flex size-7 items-center justify-center rounded-full border border-border hover:bg-accent"
                >
                  {panel.collapsed ? "+" : "–"}
                </button>
                <button
                  onClick={() => removePanel(panel.key)}
                  aria-label="Close"
                  className="flex size-7 items-center justify-center rounded-full border border-border hover:bg-accent"
                >
                  ✕
                </button>
              </div>

              {!panel.collapsed && (
                <div className="p-5">
                  {panel.loading && (
                    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                      <span className="size-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                      Analyzing…
                    </div>
                  )}
                  {panel.error && <div className="py-6 text-sm text-destructive">{panel.error}</div>}
                  {!panel.loading && !panel.error && panel.account && (
                    <AccountDetailView
                      result={panel.account.result}
                      score={panel.account.score}
                      demoUserName={demoUserName}
                      salesforceUrl={panel.account.salesforceUrl}
                    />
                  )}
                  {!panel.loading && !panel.error && panel.lead && (
                    <LeadDetailView
                      result={panel.lead.result}
                      score={panel.lead.score}
                      salesforceUrl={panel.lead.salesforceUrl}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
