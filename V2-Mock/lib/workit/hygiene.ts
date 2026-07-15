import type { Account } from "@/lib/salesforce/types";
import type { CompanyResearchResult } from "@/lib/research/types";

export interface HygieneSuggestion {
  field: string;
  current: string;
  suggested: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Suggested SFDC field updates derived from research. The mock account record
 * has no revenue/employee fields, so anything research found is a fill-in.
 */
export function buildHygieneSuggestions(
  account: Account,
  research: CompanyResearchResult,
): HygieneSuggestion[] {
  const suggestions: HygieneSuggestion[] = [];

  if (research.revenue.amount !== null) {
    suggestions.push({
      field: "Annual Revenue",
      current: "(blank)",
      suggested: formatCurrency(research.revenue.amount),
    });
  }

  if (research.employeeCount.count !== null) {
    suggestions.push({
      field: "Employees",
      current: "(blank)",
      suggested: String(research.employeeCount.count),
    });
  }

  suggestions.push({
    field: "Website",
    current: `https://${account.domain}`,
    suggested: account.domain,
  });

  return suggestions;
}
