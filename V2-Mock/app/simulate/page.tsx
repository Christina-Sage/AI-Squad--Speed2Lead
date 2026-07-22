import Link from "next/link";
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
      <div className="mb-4 text-[12.5px] text-muted-foreground">
        <Link href="/" className="text-link hover:underline">
          ← Worklist
        </Link>{" "}
        / Simulate a lead
      </div>

      <div className="mb-5">
        <h1 className="font-heading text-[24px] font-black">Simulate an inbound web-form lead</h1>
        <p className="mt-1 max-w-[680px] text-muted-foreground">
          Fill in this form the way a prospect would on the website. On submit, the data is prepped
          and scored, then written to the mock Salesforce as a new lead that shows up live in the SDR
          worklist. This stands in for the real path: web form → Eloqua → API → Salesforce →
          LeanData routing. Eloqua and LeanData aren&apos;t replicated — the point is the end-to-end
          hand-off from form to a workable lead.
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
