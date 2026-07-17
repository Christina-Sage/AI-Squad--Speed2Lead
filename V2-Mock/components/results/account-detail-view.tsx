"use client";

import type { WorkabilityResult } from "@/lib/workability/engine";
import type { AccountScore } from "@/lib/scoring/scoring";
import { buildSalesforceAccountUrl } from "@/lib/salesforce/urls";
import { DedupeChecklist } from "@/components/results/dedupe-checklist";
import { ScoringCard } from "@/components/results/scoring-card";
import { OwnerEditor } from "@/components/results/owner-editor";
import { AbmStatusEditor } from "@/components/results/abm-status-editor";

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

/**
 * The account detail body — verdict checklist, account summary, and scoring card.
 * Shared by the standalone /account/[id] route and the inline stacked feed so the
 * two never drift (build-plan step 7).
 */
export function AccountDetailView({
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
  const crmUrl = salesforceUrl ?? buildSalesforceAccountUrl(result.account_id);

  return (
    <div>
      <DedupeChecklist
        accountId={result.account_id}
        checks={result.checks}
        finalStatus={result.final_status}
        reason={result.reason}
        recommendation={result.recommendation}
        ownerName={result.owner}
        isCurrentOwner={result.owner === demoUserName}
        salesforceUrl={crmUrl}
      />

      <div className="mb-6 rounded-[14px] border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">Account Summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 p-5 md:grid-cols-4">
          <SummaryField label="Account Name">
            <a href={crmUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
              {result.account_name}
            </a>
          </SummaryField>
          <SummaryField label="Domain">
            <a
              href={`https://${result.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:underline"
            >
              {result.domain}
            </a>
          </SummaryField>
          <SummaryField label="Industry">{result.industry}</SummaryField>
          <SummaryField label="Type">{result.type}</SummaryField>
          <SummaryField label="TAM">{result.tam_status}</SummaryField>
          <SummaryField label="Owner">
            <OwnerEditor accountId={result.account_id} currentOwnerName={result.owner} />
          </SummaryField>
          <SummaryField label="ABM Account Status">
            <AbmStatusEditor accountId={result.account_id} currentStatus={result.abm_nurture_status} />
          </SummaryField>
          <SummaryField label="Team">{result.team}</SummaryField>
        </div>
      </div>

      {score && <ScoringCard accountId={result.account_id} score={score} />}
    </div>
  );
}
