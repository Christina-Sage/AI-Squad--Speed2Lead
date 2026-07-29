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

/**
 * Human-friendly age of an open opportunity from its created date — surfaced as
 * an "Age" fact on the Open Opportunity check. Days up to two months, then
 * rounded to whole months. Returns "Unknown" when the created date is missing
 * or unparseable (e.g. the Intacct fallback detail carries no date).
 */
export function opportunityAge(createdDate: string): string {
  if (!createdDate) return "Unknown";
  const then = new Date(createdDate);
  if (Number.isNaN(then.getTime())) return "Unknown";
  const days = Math.floor((Date.now() - then.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  if (days < 60) return `${days} days`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month" : `${months} months`;
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
