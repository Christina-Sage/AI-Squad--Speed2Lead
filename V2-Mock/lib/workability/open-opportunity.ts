import type { IntacctFields, Opportunity } from "@/lib/salesforce/types";

export interface OpenOpportunityDetail {
  source: "Salesforce" | "Intacct";
  name: string;
  owner: string;
  stage: string;
  createdDate: string;
}

export interface OpenOppResult {
  status: "PASS" | "FAIL";
  openOpportunities: OpenOpportunityDetail[];
}

export function evaluateOpenOpportunities(
  opportunities: Opportunity[],
  intacct: IntacctFields,
): OpenOppResult {
  const openOpportunities: OpenOpportunityDetail[] = [];

  for (const opp of opportunities) {
    if (!opp.isClosed) {
      openOpportunities.push({
        source: "Salesforce",
        name: opp.name,
        owner: opp.ownerName,
        stage: opp.stage,
        createdDate: opp.createdDate,
      });
    }
  }

  if (intacct.hasOpenOpps) {
    for (const detail of intacct.openOppDetails ?? []) {
      openOpportunities.push({
        source: "Intacct",
        name: detail.name,
        owner: detail.owner,
        stage: detail.stage,
        createdDate: detail.createdDate,
      });
    }
    if ((intacct.openOppDetails ?? []).length === 0) {
      openOpportunities.push({
        source: "Intacct",
        name: "Open Opportunity (Intacct)",
        owner: "Unknown",
        stage: "Open",
        createdDate: "",
      });
    }
  }

  return {
    status: openOpportunities.length > 0 ? "FAIL" : "PASS",
    openOpportunities,
  };
}
