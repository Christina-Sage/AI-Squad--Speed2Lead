import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getSalesforceProvider, detectSearchType } from "@/lib/salesforce/provider";
import { evaluateWorkability } from "@/lib/workability/engine";
import { getDemoUser, DEMO_USER_COOKIE } from "@/lib/auth/demo-user";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { AccountSummaryCard } from "@/components/results/account-summary-card";
import { RoeValidationSection } from "@/components/results/roe-validation-section";
import { OpenOpportunitySection } from "@/components/results/open-opportunity-section";
import { CustomerValidationSection } from "@/components/results/customer-validation-section";
import { FinalRecommendationBanner } from "@/components/results/final-recommendation-banner";
import { AssignToMeButton } from "@/components/results/assign-to-me-button";
import { WorkItButton } from "@/components/results/work-it-button";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { accountId } = await params;
  const { q } = await searchParams;

  const provider = getSalesforceProvider();
  const bundle = await provider.getAccountBundle(accountId);
  if (!bundle) {
    notFound();
  }

  const cookieStore = await cookies();
  const demoUser = getDemoUser(cookieStore.get(DEMO_USER_COOKIE)?.value);
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  const result = evaluateWorkability(bundle, team);
  const searchInput = q ?? result.domain;

  await writeAuditLog({
    userId: demoUser.id,
    userName: demoUser.name,
    team,
    searchInput,
    searchType: detectSearchType(searchInput),
    accountId: result.account_id,
    domain: result.domain,
    accountName: result.account_name,
    finalStatus: result.final_status,
    reason: result.reason,
    reasonCodes: result.reason_codes,
    action: "SEARCH",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <FinalRecommendationBanner
        status={result.final_status}
        reason={result.reason}
        recommendation={result.recommendation}
      />
      <AccountSummaryCard result={result} />
      <RoeValidationSection roe={result.roe_detail} scope={result.roe_scope} team={result.team} />
      <OpenOpportunitySection openOpp={result.open_opportunity_detail} />
      <CustomerValidationSection result={result} />
      <div className="flex items-center gap-3">
        {result.final_status !== "NOT WORKABLE" && (
          <AssignToMeButton
            accountId={result.account_id}
            isCurrentOwner={result.owner === demoUser.name}
          />
        )}
        <WorkItButton accountId={result.account_id} />
      </div>
    </div>
  );
}
