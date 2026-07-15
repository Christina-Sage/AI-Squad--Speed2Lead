export interface MatchedSalesforceRecord {
  type: "Contact" | "Lead";
  name: string;
}

export interface FoundContact {
  name: string;
  title: string;
  source: "990" | "website";
  isIcpMatch: boolean;
  inSalesforce: boolean;
  matchedRecord: MatchedSalesforceRecord | null;
}

export interface RevenueInfo {
  amount: number | null;
  taxYear: number | null;
  source: "990" | "website" | null;
}

export interface EmployeeCountInfo {
  count: number | null;
  source: "990" | "website" | null;
  note?: string;
}

export interface RevenueStreamItem {
  label: string;
  amount: number;
  pct: number;
}

export interface CompanyResearchResult {
  dataSource: "propublica" | "website" | "none";
  organizationName: string | null;
  ein: string | null;
  form990Url: string | null;
  companyHistory: string | null;
  revenue: RevenueInfo;
  employeeCount: EmployeeCountInfo;
  revenueStream: RevenueStreamItem[];
  foundContacts: FoundContact[];
  flaggedContacts: FoundContact[];
  errors: string[];
}
