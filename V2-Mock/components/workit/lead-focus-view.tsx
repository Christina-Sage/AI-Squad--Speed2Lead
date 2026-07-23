"use client";

import { useState } from "react";
import type { LeadWorkabilityResult } from "@/lib/leads/types";
import type { AccountScore } from "@/lib/scoring/scoring";
import { LeadDetailView } from "@/components/results/lead-detail-view";
import { AccountFitCard } from "@/components/workit/account-fit-card";
import {
  WorkItPanel,
  type PanelContact,
  type PanelExistingRecord,
  type PanelSignals,
} from "@/components/workit/work-it-panel";
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
 * The focused SDR-lead experience. The lead is the unit of work; the account is
 * context. "Work it ⚡" collapses the checks and reveals the company research +
 * work-it surface. When the lead has a linked account we research that account;
 * when it doesn't, we research the company off its name + email-inferred domain,
 * so a standalone lead gets the same surface (keyed by the lead id).
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
  // Work-it mutations (contacts, hygiene, outreach) are keyed by this id —
  // the account when linked, otherwise the lead itself.
  const workItId = accountId ?? leadId;
  const workable = result.final_status !== "NOT WORKABLE";
  const [workingIt, setWorkingIt] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WorkItData | null>(null);

  async function loadWorkIt() {
    setLoading(true);
    setError(null);
    try {
      const url = accountId ? `/api/work-it/${accountId}` : `/api/work-it/lead/${leadId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
    } catch {
      setError("Couldn’t load the company research. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function startWorkIt() {
    setWorkingIt(true);
    if (!data && !loading) loadWorkIt();
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
          {loading && (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <span className="size-4 animate-spin rounded-full border-2 border-border border-t-primary" />
              {accountId ? "Gathering account research…" : "Researching the company…"}
            </div>
          )}
          {error && (
            <div className="py-6 text-sm text-destructive">
              {error}{" "}
              <button onClick={loadWorkIt} className="font-semibold underline">
                Retry
              </button>
            </div>
          )}
          {!loading && !error && data && (
            <>
              <AccountFitCard
                accountId={workItId}
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
                accountId={workItId}
                accountName={data.account.name}
                domain={data.account.domain}
                industry={data.account.industry}
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
        </div>
      )}
    </>
  );
}
