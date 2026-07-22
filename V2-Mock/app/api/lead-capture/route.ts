import { NextResponse } from "next/server";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import {
  COMPANY_SIZES,
  INDUSTRIES,
  PRODUCTS,
  REQUEST_TYPES,
  TIMEFRAMES,
  type CompanySize,
  type Industry,
  type LeadIntakeInput,
  type ProductInterest,
  type RequestType,
  type Timeframe,
} from "@/lib/leads/lead-intake";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function oneOf<T extends readonly string[]>(value: unknown, options: T): T[number] | null {
  const v = str(value);
  return (options as readonly string[]).includes(v) ? (v as T[number]) : null;
}

/**
 * Web-form lead capture (`/simulate`). Validates the submitted fields and
 * creates a scored, prioritized lead in the mock Salesforce worklist. This is
 * the simulation of the form → Eloqua → API → Salesforce path; no external
 * systems are called.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const firstName = str(body?.firstName);
  const lastName = str(body?.lastName);
  const email = str(body?.email);
  const company = str(body?.company);
  const jobTitle = str(body?.jobTitle);
  const message = str(body?.message);

  const companySize = oneOf<typeof COMPANY_SIZES>(body?.companySize, COMPANY_SIZES);
  const industry = oneOf<typeof INDUSTRIES>(body?.industry, INDUSTRIES);
  const productInterest = oneOf<typeof PRODUCTS>(body?.productInterest, PRODUCTS);
  const timeframe = oneOf<typeof TIMEFRAMES>(body?.timeframe, TIMEFRAMES);
  const requestType = oneOf<typeof REQUEST_TYPES>(body?.requestType, REQUEST_TYPES);

  const errors: string[] = [];
  if (!firstName) errors.push("First name is required");
  if (!lastName) errors.push("Last name is required");
  if (!email || !EMAIL_PATTERN.test(email)) errors.push("A valid work email is required");
  if (!company) errors.push("Company is required");
  if (!jobTitle) errors.push("Job title is required");
  if (!companySize) errors.push("Company size is required");
  if (!industry) errors.push("Industry is required");
  if (!productInterest) errors.push("Product interest is required");
  if (!timeframe) errors.push("Timeframe is required");
  if (!requestType) errors.push("Request type is required");

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 400 });
  }

  const input: LeadIntakeInput = {
    firstName,
    lastName,
    email,
    company,
    jobTitle,
    // Non-null after validation above.
    companySize: companySize as CompanySize,
    industry: industry as Industry,
    productInterest: productInterest as ProductInterest,
    timeframe: timeframe as Timeframe,
    requestType: requestType as RequestType,
    message: message || undefined,
  };

  const provider = getSalesforceProvider();
  const lead = await provider.createLead(input);

  return NextResponse.json({
    success: true,
    lead: {
      id: lead.id,
      name: lead.name,
      title: lead.title,
      company: lead.company ?? null,
      source: lead.source ?? null,
      priorityGroup: lead.priorityGroup,
      fit: lead.fit,
      intent: lead.intent,
      workability: lead.workability,
      score: lead.score,
    },
  });
}
