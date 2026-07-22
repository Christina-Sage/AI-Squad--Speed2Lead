import { LeadCaptureForm } from "@/components/simulate/lead-capture-form";
import {
  COMPANY_SIZES,
  INDUSTRIES,
  PRODUCTS,
  REQUEST_TYPES,
  TIMEFRAMES,
} from "@/lib/leads/lead-intake";

const STAGES: [string, string][] = [
  ["Web form", "Prospect submits this form"],
  ["Prep & score", "Fields normalized and scored (mock Eloqua)"],
  ["Salesforce lead", "New lead created via API"],
  ["SDR worklist", "Routed and ranked for an SDR"],
];

export default function SimulatePage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="font-heading text-[24px] font-black">Talk to a Sage finance expert</h1>
        <p className="mt-1 max-w-[680px] text-muted-foreground">
          Tell us about your organization and we&apos;ll be in touch. This is a standalone lead-capture
          form: on submit the data is prepped and scored, then created as a new lead that appears in
          the SDR worklist on the WorkIt dashboard. It stands in for the real path — web form → Eloqua
          → API → Salesforce → LeanData routing — without replicating Eloqua or LeanData.
        </p>
      </div>

      <ol className="mb-6 flex flex-wrap items-stretch gap-2">
        {STAGES.map(([title, detail], i) => (
          <li
            key={title}
            className="flex-1 min-w-[150px] rounded-[10px] border border-border bg-card px-3 py-2.5"
          >
            <div className="text-[11px] text-muted-foreground">Step {i + 1}</div>
            <div className="text-[13px] font-semibold">{title}</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">{detail}</div>
          </li>
        ))}
      </ol>

      <LeadCaptureForm
        options={{
          companySizes: COMPANY_SIZES,
          industries: INDUSTRIES,
          products: PRODUCTS,
          timeframes: TIMEFRAMES,
          requestTypes: REQUEST_TYPES,
        }}
      />
    </div>
  );
}
