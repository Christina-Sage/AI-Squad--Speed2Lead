"use client";

import { useState } from "react";
import type { WorkabilityResult } from "@/lib/workability/engine";
import type { AccountScore } from "@/lib/scoring/scoring";
import { AccountDetailView } from "@/components/results/account-detail-view";
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
 * The focused account experience for the in-page worklist. One "Work it ⚡"
 * button (in the checklist) does everything: it collapses the six-check list to
 * an accordion and reveals the work-it layer (research, hygiene, contacts,
 * push, Not-a-Fit) below — all without leaving the worklist.
 */
export function AccountFocusView({
  result,
  score,
  demoUserName,
  salesforceUrl,
}: {
  result: WorkabilityResult;
  score: AccountScore | null;
  demoUserName: string;
  salesforceUrl?: string;
}) {
  const accountId = result.account_id;
  const workable = score !== null;
  const [workingIt, setWorkingIt] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WorkItData | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/work-it/${accountId}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
    } catch {
      setError("Couldn’t load the Work-it details. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // Fired from the checklist's "Work it ⚡" button (a click handler, so the
  // fetch/setState here is not a render-time side effect).
  function startWorkIt() {
    setWorkingIt(true);
    if (!data && !loading) load();
  }

  return (
    <>
      <AccountDetailView
        result={result}
        demoUserName={demoUserName}
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
              Gathering research…
            </div>
          )}
          {error && (
            <div className="py-6 text-sm text-destructive">
              {error}{" "}
              <button onClick={load} className="font-semibold underline">
                Retry
              </button>
            </div>
          )}
          {!loading && !error && data && (
            <>
              {score && (
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
              )}
              <WorkItPanel
                accountId={accountId}
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
