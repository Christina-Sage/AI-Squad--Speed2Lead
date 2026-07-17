"use client";

import type { LeadWorkabilityResult } from "@/lib/leads/types";
import type { AccountScore } from "@/lib/scoring/scoring";
import { buildSalesforceLeadUrl } from "@/lib/salesforce/urls";
import { DedupeChecklist } from "@/components/results/dedupe-checklist";
import { ScoringCard } from "@/components/results/scoring-card";
import { useToast } from "@/components/ui/toaster";

function SummaryField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
        {label}
      </label>
      <div className="text-[13.5px] font-bold">{children}</div>
    </div>
  );
}

const NA = <span className="font-medium text-muted-foreground">N/A</span>;

/**
 * The SDR lead detail body — a lead-level version of the account detail, reusing
 * the same checklist and scoring layout for consistency (build-plan step 6).
 */
export function LeadDetailView({
  result,
  score,
  salesforceUrl,
}: {
  result: LeadWorkabilityResult;
  score: AccountScore;
  salesforceUrl?: string;
}) {
  const toast = useToast();
  const crmUrl = salesforceUrl ?? buildSalesforceLeadUrl(result.lead_id);
  const ok = result.final_status !== "NOT WORKABLE";

  const actions = (
    <>
      {ok ? (
        <button
          onClick={() => toast("Lead assigned to you")}
          className="inline-flex items-center gap-1.5 rounded-[9px] border border-primary bg-primary px-4 py-2 text-[13.5px] font-semibold text-primary-foreground hover:brightness-110"
        >
          Assign lead to me
        </button>
      ) : (
        <button
          onClick={() => toast("Routed to the account owner with your note")}
          className="inline-flex items-center gap-1.5 rounded-[9px] border border-border bg-card px-4 py-2 text-[13.5px] font-semibold hover:border-muted-foreground"
        >
          Notify owner / request handoff
        </button>
      )}
      <a
        href={crmUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-[9px] border border-border bg-card px-4 py-2 text-[13.5px] font-semibold hover:border-muted-foreground"
      >
        Open in CRM
      </a>
    </>
  );

  return (
    <div>
      <DedupeChecklist
        accountId={result.lead_id}
        checks={result.checks}
        finalStatus={result.final_status}
        reason={result.reason}
        recommendation={result.recommendation}
        ownerName={result.owner}
        isCurrentOwner={false}
        salesforceUrl={crmUrl}
        title="Can I work this lead?"
        subtitle="Lead-level six-check checklist"
        runningTitle="Running the lead checks…"
        actions={actions}
      />

      <div className="mb-6 rounded-[14px] border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">Lead Summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 p-5 md:grid-cols-4">
          <SummaryField label="Name">{result.name}</SummaryField>
          <SummaryField label="Title">{result.title}</SummaryField>
          <SummaryField label="Linked Account">
            {result.account_id && result.account_name ? (
              <a
                href={`/account/${result.account_id}`}
                className="text-link hover:underline"
              >
                {result.account_name}
              </a>
            ) : (
              NA
            )}
          </SummaryField>
          <SummaryField label="Domain">
            {result.domain ? (
              <a
                href={`https://${result.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link hover:underline"
              >
                {result.domain}
              </a>
            ) : (
              NA
            )}
          </SummaryField>
          <SummaryField label="Owner">{result.owner}</SummaryField>
          <SummaryField label="Lead Status">{result.status}</SummaryField>
          <SummaryField label="Team">{result.team}</SummaryField>
          <SummaryField label="Priority">{result.priority_group}</SummaryField>
        </div>
      </div>

      <ScoringCard accountId={result.lead_id} score={score} />
    </div>
  );
}
