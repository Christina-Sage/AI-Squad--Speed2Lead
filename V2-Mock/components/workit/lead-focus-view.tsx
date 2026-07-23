"use client";

import { useState } from "react";
import type { LeadWorkabilityResult } from "@/lib/leads/types";
import type { AccountScore } from "@/lib/scoring/scoring";
import { LeadDetailView } from "@/components/results/lead-detail-view";
import { ScoringCard } from "@/components/results/scoring-card";
import { AccountFitCard } from "@/components/workit/account-fit-card";
import {
  WorkItPanel,
  type PanelContact,
  type PanelExistingRecord,
  type PanelSignals,
} from "@/components/workit/work-it-panel";
import { useToast } from "@/components/ui/toaster";
import { SEQUENCES, SEQUENCE_GROUPS } from "@/lib/outreach";
import { NOT_A_FIT_REASONS } from "@/lib/workit/not-a-fit";
import { OutreachProspectPanel, type OutreachProspect } from "@/components/workit/outreach-prospect-panel";
import type { CompanyResearchResult } from "@/lib/research/types";
import type { CompanyIntel } from "@/lib/research/company-intel";
import type { HygieneSuggestion } from "@/lib/workit/hygiene";
import type { OutreachPush } from "@/lib/outreach";

interface WorkItData {
  account: { name: string; domain: string; industry: string };
  research: CompanyResearchResult;
  intel: CompanyIntel | null;
  sourceLabel: string;
  revenueAmount: number | null;
  fteCount: number | null;
  hygiene: HygieneSuggestion[];
  sequences: string[];
  signals: PanelSignals;
  foundContacts: PanelContact[];
  existingRecords: PanelExistingRecord[];
  workItState: {
    addedContactNames: string[];
    appliedHygieneFields: string[];
    outreachPush: OutreachPush | null;
  };
}

/**
 * Freemail lead (no linked account): only the lead's own form data exists, so
 * there's no company research to show — but the SDR can still push the person
 * to a sequence or mark them Not a Fit. Both record the lead and return to the
 * worklist marked worked.
 */
function LeadOnlyDecision({
  leadId,
  leadName,
  leadTitle,
}: {
  leadId: string;
  leadName: string;
  leadTitle?: string | null;
}) {
  const toast = useToast();
  const [sequence, setSequence] = useState(SEQUENCES[0]);
  const [reason, setReason] = useState(NOT_A_FIT_REASONS[0]);
  const [busy, setBusy] = useState<string | null>(null);
  const [outreachProspect, setOutreachProspect] = useState<OutreachProspect | null>(null);

  function toWorklist() {
    window.location.assign(`/?worked=${encodeURIComponent(leadId)}`);
  }

  async function run(action: "push" | "not_fit") {
    setBusy(action);
    try {
      const res = await fetch("/api/lead-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action, sequence, reason }),
      });
      const data = await res.json();
      if (!data.success) {
        toast(data.error ?? "Something went wrong");
        setBusy(null);
        return;
      }
      if (action === "push") {
        toast(`${leadName} added to “${sequence}” in Outreach`);
        // Open the simulated Outreach panel; closing returns to the worklist.
        setOutreachProspect({ name: leadName, title: leadTitle ?? null });
        setBusy(null);
        return;
      }
      toast(`Marked “Not a Fit” — ${reason}`);
      toWorklist();
    } catch {
      toast("Something went wrong");
      setBusy(null);
    }
  }

  return (
    <>
    <div className="rounded-[14px] border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <h2 className="text-[15.5px] font-semibold">Work this lead</h2>
        <span className="text-[12.5px] text-muted-foreground">
          No linked account (inbound / freemail) — push the person straight to a sequence
        </span>
      </div>
      <div className="p-5">
        <p className="mb-2 text-[13px] font-bold">Push to Outreach</p>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <select
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            className="rounded-[9px] border border-border bg-card px-3 py-2 text-sm text-foreground hover:border-muted-foreground"
          >
            {SEQUENCE_GROUPS.map((g) => (
              <optgroup key={g.value} label={g.value}>
                {g.items.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            onClick={() => run("push")}
            disabled={busy !== null}
            className="rounded-[9px] border border-primary bg-primary px-4 py-2 text-[13.5px] font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-45"
          >
            {busy === "push" ? "Pushing…" : `Push ${leadName} to Outreach`}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <span className="text-[12.5px] text-muted-foreground">Not the right lead?</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-[9px] border border-border bg-card px-3 py-2 text-sm text-foreground hover:border-muted-foreground"
          >
            {NOT_A_FIT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            onClick={() => run("not_fit")}
            disabled={busy !== null}
            className="rounded-[9px] border border-destructive bg-transparent px-4 py-2 text-[13.5px] font-semibold text-destructive hover:bg-destructive-bg disabled:opacity-45"
          >
            {busy === "not_fit" ? "Marking…" : "Mark “Not a Fit”"}
          </button>
        </div>
      </div>
    </div>
    {outreachProspect && (
      <OutreachProspectPanel
        prospects={[outreachProspect]}
        sequence={sequence}
        onClose={toWorklist}
      />
    )}
    </>
  );
}

/**
 * The focused SDR-lead experience. The lead is the unit of work; the account is
 * context. "Work it ⚡" collapses the checks and reveals: the linked account's
 * research + work-it surface when there's an account, or a lead-only push
 * surface when there isn't (freemail).
 */
export function LeadFocusView({
  result,
  score,
  salesforceUrl,
}: {
  result: LeadWorkabilityResult;
  score: AccountScore;
  salesforceUrl?: string;
}) {
  const leadId = result.lead_id;
  const accountId = result.account_id;
  const workable = result.final_status !== "NOT WORKABLE";
  const [workingIt, setWorkingIt] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WorkItData | null>(null);

  async function loadAccount(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/work-it/${id}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
    } catch {
      setError("Couldn’t load the account details. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function startWorkIt() {
    setWorkingIt(true);
    if (accountId && !data && !loading) loadAccount(accountId);
  }

  return (
    <>
      <LeadDetailView
        result={result}
        salesforceUrl={salesforceUrl}
        onWorkIt={workable && !workingIt ? startWorkIt : undefined}
        collapsible={workingIt}
        collapsed={workingIt ? !expanded : undefined}
        onToggleCollapsed={() => setExpanded((v) => !v)}
      />

      {workingIt && (
        <div className="mt-2">
          {accountId ? (
            <>
              {loading && (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <span className="size-4 animate-spin rounded-full border-2 border-border border-t-primary" />
                  Gathering account research…
                </div>
              )}
              {error && (
                <div className="py-6 text-sm text-destructive">
                  {error}{" "}
                  <button onClick={() => loadAccount(accountId)} className="font-semibold underline">
                    Retry
                  </button>
                </div>
              )}
              {!loading && !error && data && (
                <>
                  <AccountFitCard
                    accountId={accountId}
                    score={score}
                    accountName={data.account.name}
                    domain={data.account.domain}
                    industry={data.account.industry}
                    sourceLabel={data.sourceLabel}
                    revenueAmount={data.revenueAmount}
                    fteCount={data.fteCount}
                    intel={data.intel}
                    research={data.research}
                    foundContacts={data.foundContacts}
                    existingRecords={data.existingRecords}
                    initialAddedNames={data.workItState.addedContactNames}
                  />
                  <WorkItPanel
                    accountId={accountId}
                    accountName={data.account.name}
                    domain={data.account.domain}
                    foundContacts={data.foundContacts}
                    existingRecords={data.existingRecords}
                    hygiene={data.hygiene}
                    sequences={data.sequences}
                    signals={data.signals}
                    initialAppliedFields={data.workItState.appliedHygieneFields}
                    initialPush={data.workItState.outreachPush}
                  />
                </>
              )}
            </>
          ) : (
            <>
              {/* Freemail lead — no linked account to research, so show the
                  score summary above the lead-only push surface. */}
              <div className="mb-5">
                <ScoringCard accountId={leadId} score={score} />
              </div>
              <LeadOnlyDecision leadId={leadId} leadName={result.name} leadTitle={result.title} />
            </>
          )}
        </div>
      )}
    </>
  );
}
