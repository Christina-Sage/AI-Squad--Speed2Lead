import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AbmStatusEditor } from "@/components/results/abm-status-editor";
import { OwnerEditor } from "@/components/results/owner-editor";
import { buildSalesforceAccountUrl } from "@/lib/salesforce/provider";
import type { WorkabilityResult } from "@/lib/workability/engine";

export function AccountSummaryCard({ result }: { result: WorkabilityResult }) {
  const rowsBeforeOwner: [string, string][] = [
    ["Industry", result.industry],
    ["Type", result.type],
    ["TAM", result.tam_status],
  ];
  const rowsAfterOwner: [string, string][] = [["Team", result.team]];

  return (
    <Card className="border-white/10 bg-card/80">
      <CardHeader>
        <CardTitle>Account Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="contents">
            <dt className="text-muted-foreground">Account Name</dt>
            <dd className="font-medium">
              <a
                href={buildSalesforceAccountUrl(result.account_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {result.account_name}
              </a>
            </dd>
          </div>
          <div className="contents">
            <dt className="text-muted-foreground">Domain</dt>
            <dd className="font-medium">
              <a
                href={`https://${result.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {result.domain}
              </a>
            </dd>
          </div>
          {rowsBeforeOwner.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
          <div className="contents">
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="font-medium">
              <OwnerEditor accountId={result.account_id} currentOwnerName={result.owner} />
            </dd>
          </div>
          <div className="contents">
            <dt className="text-muted-foreground">ABM Account Status</dt>
            <dd className="font-medium">
              <AbmStatusEditor accountId={result.account_id} currentStatus={result.abm_nurture_status} />
            </dd>
          </div>
          {rowsAfterOwner.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
