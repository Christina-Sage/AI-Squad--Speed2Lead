import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getSalesforceProvider, buildSalesforceLeadUrl } from "@/lib/salesforce/provider";
import { evaluateLeadWorkability } from "@/lib/leads/lead-workability";
import { duplicateInfoFor } from "@/lib/leads/lead-dedupe";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";
import { LeadDetailView } from "@/components/results/lead-detail-view";

export default async function LeadPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;

  const provider = getSalesforceProvider();
  const bundle = await provider.getSdrLeadBundle(leadId);
  if (!bundle) {
    notFound();
  }

  const cookieStore = await cookies();
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  const duplicateInfo = duplicateInfoFor(leadId, await provider.listSdrLeads());
  const result = evaluateLeadWorkability(bundle.lead, bundle.accountBundle, team, duplicateInfo);

  return (
    <div>
      <div className="mb-4 text-[12.5px] text-muted-foreground">
        <Link href="/" className="text-link hover:underline">
          ← Worklist
        </Link>{" "}
        / {result.name}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3.5">
        <h1 className="font-heading text-[21px] font-black">{result.name}</h1>
        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
          {result.title}
        </span>
      </div>

      <LeadDetailView result={result} salesforceUrl={buildSalesforceLeadUrl(leadId)} />
    </div>
  );
}
