"use client";

import { useState } from "react";
import { CompanyResearchCards } from "@/components/workit/company-research-cards";
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
 * "Work it ⚡" action for the in-page focus view. Fetches the work-it layer
 * from /api/work-it/[id] on demand and reveals the same research + Work-it
 * panel the standalone route renders — no navigation away from the worklist.
 */
export function WorkItReveal({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
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

  function workIt() {
    setOpen(true);
    if (!data && !loading) load();
  }

  if (!open) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={workIt}
          className="rounded-[11px] bg-primary px-5 py-3 text-[14.5px] font-extrabold text-primary-foreground hover:brightness-110"
        >
          Work it ⚡
        </button>
        <span className="text-[12.5px] text-muted-foreground">
          Research, data hygiene, contacts, and Outreach — right here, no page change.
        </span>
      </div>
    );
  }

  return (
    <div className="mt-6">
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
          <CompanyResearchCards
            research={data.research}
            intel={data.intel}
            sourceLabel={data.sourceLabel}
            revenueAmount={data.revenueAmount}
            fteCount={data.fteCount}
            industry={data.account.industry}
          />
          <WorkItPanel
            accountId={accountId}
            foundContacts={data.foundContacts}
            existingRecords={data.existingRecords}
            hygiene={data.hygiene}
            sequences={data.sequences}
            signals={data.signals}
            initialAddedNames={data.workItState.addedContactNames}
            initialAppliedFields={data.workItState.appliedHygieneFields}
            initialPush={data.workItState.outreachPush}
          />
        </>
      )}
    </div>
  );
}
