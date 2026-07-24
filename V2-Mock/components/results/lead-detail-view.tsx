"use client";

import type { LeadWorkabilityResult } from "@/lib/leads/types";
import { buildSalesforceLeadUrl } from "@/lib/salesforce/urls";
import { DedupeChecklist } from "@/components/results/dedupe-checklist";
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
 * the same checklist layout for consistency (build-plan step 6). Like the
 * account view, the "Should I work it?" scoring card is NOT rendered here; it
 * appears only after the SDR pushes "Work it" (see LeadFocusView).
 */
export function LeadDetailView({
  result,
  salesforceUrl,
  onWorkIt,
  collapsible,
  collapsed,
  onToggleCollapsed,
}: {
  result: LeadWorkabilityResult;
  salesforceUrl?: string;
  // Same in-page focus wiring as the account view: "Work it" becomes an
  // in-page action and the checks collapse once you're working the lead.
  onWorkIt?: () => void;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const toast = useToast();
  const crmUrl = salesforceUrl ?? buildSalesforceLeadUrl(result.lead_id);
  const ok = result.final_status !== "NOT WORKABLE";

  const actions = (
    <>
      {ok && onWorkIt && (
        <button
          onClick={onWorkIt}
          className="inline-flex items-center gap-1.5 rounded-[9px] border border-primary bg-primary px-4 py-2 text-[13.5px] font-semibold text-primary-foreground hover:brightness-110"
        >
          Work it ⚡
        </button>
      )}
      {ok ? (
        <button
          onClick={() => toast("Lead assigned to you")}
          className="inline-flex items-center gap-1.5 rounded-[9px] border border-border bg-card px-4 py-2 text-[13.5px] font-semibold hover:border-muted-foreground"
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
        subtitle="Lead-level de-dupe & workability checklist"
        runningTitle="Running the lead checks…"
        actions={actions}
        collapsible={collapsible}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
      />

      <div className="mb-6 rounded-[14px] border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">Lead Summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 p-5 md:grid-cols-4">
          <SummaryField label="Name">{result.name}</SummaryField>
          <SummaryField label="Title">{result.title}</SummaryField>
          <SummaryField label="Company">{result.company ?? NA}</SummaryField>
          <SummaryField label="Email">
            {result.email ? (
              <a href={`mailto:${result.email}`} className="text-link hover:underline">
                {result.email}
              </a>
            ) : (
              NA
            )}
          </SummaryField>
          <SummaryField label="Associated Account">
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
          <SummaryField label="Marketing Campaign Source">
            {result.marketing_campaign ? (
              <>
                {result.marketing_campaign.name}
                {result.marketing_campaign.date && (
                  <span className="ml-1 font-medium text-muted-foreground">
                    ({new Date(result.marketing_campaign.date).toLocaleDateString()})
                  </span>
                )}
              </>
            ) : (
              NA
            )}
          </SummaryField>
        </div>
      </div>
    </div>
  );
}
