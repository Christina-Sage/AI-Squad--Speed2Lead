"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface IntakeOptions {
  companySizes: readonly string[];
  industries: readonly string[];
  products: readonly string[];
  timeframes: readonly string[];
  requestTypes: readonly string[];
}

interface CreatedLead {
  id: string;
  name: string;
  title: string;
  company: string | null;
  source: string | null;
  priorityGroup: string;
  fit: number;
  intent: number;
  workability: number;
  score: number;
}

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  jobTitle: "",
  companySize: "",
  industry: "",
  productInterest: "",
  timeframe: "",
  requestType: "",
  message: "",
};

const fieldClass =
  "h-10 w-full rounded-[9px] border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring";
const labelClass = "mb-1.5 block text-[12.5px] font-semibold text-foreground";

function Pillar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-border bg-background px-3 py-2.5 text-center">
      <div className="font-heading text-[22px] font-black tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

export function LeadCaptureForm({ options }: { options: IntakeOptions }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [created, setCreated] = useState<CreatedLead | null>(null);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    try {
      const res = await fetch("/api/lead-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrors(data.errors ?? ["Something went wrong. Please try again."]);
        return;
      }
      setCreated(data.lead);
    } catch {
      setErrors(["Network error while submitting the form. Please try again."]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(EMPTY);
    setCreated(null);
    setErrors([]);
  }

  if (created) {
    return (
      <div className="rounded-[14px] border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle2 className="size-5" />
          <h2 className="font-heading text-[18px] font-black">Lead created in Salesforce</h2>
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          The form data was prepped and scored, and a new lead was written to the mock Salesforce
          worklist — the same path a real submission takes through Eloqua → API → Salesforce → SDR
          routing.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[10px] border border-border bg-background px-3.5 py-3">
            <div className="text-[11px] text-muted-foreground">Lead</div>
            <div className="text-[15px] font-semibold">{created.name}</div>
            <div className="text-[12.5px] text-muted-foreground">
              {created.title}
              {created.company ? ` · ${created.company}` : ""}
            </div>
          </div>
          <div className="rounded-[10px] border border-border bg-background px-3.5 py-3">
            <div className="text-[11px] text-muted-foreground">Salesforce Lead ID</div>
            <div className="font-mono text-[13px]">{created.id}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">{created.source}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2.5">
          <Pillar label="Fit" value={created.fit} />
          <Pillar label="Intent" value={created.intent} />
          <Pillar label="Workability" value={created.workability} />
          <div className="rounded-[10px] border border-primary bg-primary/10 px-3 py-2.5 text-center">
            <div className="font-heading text-[22px] font-black tabular-nums text-primary">
              {created.score}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Score · {created.priorityGroup}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            className="rounded-[9px]"
            render={
              <Link href="/">
                View in SDR worklist <ArrowRight className="ml-1 size-4" />
              </Link>
            }
          />
          <button
            type="button"
            onClick={reset}
            className="text-[13px] font-semibold text-muted-foreground hover:text-foreground"
          >
            Submit another lead
          </button>
        </div>
        <p className="mt-3 text-[11.5px] text-muted-foreground">
          Tip: switch the team to <b>SDR</b> in the top-right, and set the priority group to{" "}
          <b>{created.priorityGroup}</b> to see this lead at the top of the worklist.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[14px] border border-border bg-card p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="firstName">
            First name
          </label>
          <input
            id="firstName"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className={fieldClass}
            placeholder="Jordan"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">
            Last name
          </label>
          <input
            id="lastName"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            className={fieldClass}
            placeholder="Rivera"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={fieldClass}
            placeholder="jordan@company.com"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="company">
            Company
          </label>
          <input
            id="company"
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            className={fieldClass}
            placeholder="Rivera Nonprofit Group"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="jobTitle">
            Job title
          </label>
          <input
            id="jobTitle"
            value={form.jobTitle}
            onChange={(e) => set("jobTitle", e.target.value)}
            className={fieldClass}
            placeholder="VP Finance"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="companySize">
            Company size
          </label>
          <select
            id="companySize"
            value={form.companySize}
            onChange={(e) => set("companySize", e.target.value)}
            className={fieldClass}
          >
            <option value="">Select…</option>
            {options.companySizes.map((o) => (
              <option key={o} value={o}>
                {o} employees
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="industry">
            Industry
          </label>
          <select
            id="industry"
            value={form.industry}
            onChange={(e) => set("industry", e.target.value)}
            className={fieldClass}
          >
            <option value="">Select…</option>
            {options.industries.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="productInterest">
            Product interest
          </label>
          <select
            id="productInterest"
            value={form.productInterest}
            onChange={(e) => set("productInterest", e.target.value)}
            className={fieldClass}
          >
            <option value="">Select…</option>
            {options.products.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="timeframe">
            Buying timeframe
          </label>
          <select
            id="timeframe"
            value={form.timeframe}
            onChange={(e) => set("timeframe", e.target.value)}
            className={fieldClass}
          >
            <option value="">Select…</option>
            {options.timeframes.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="requestType">
            What are you here to do?
          </label>
          <select
            id="requestType"
            value={form.requestType}
            onChange={(e) => set("requestType", e.target.value)}
            className={fieldClass}
          >
            <option value="">Select…</option>
            {options.requestTypes.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className={labelClass} htmlFor="message">
          Anything else? <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="message"
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          rows={3}
          className="w-full resize-y rounded-[9px] border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-ring"
          placeholder="Tell us about your finance stack, timeline, or questions."
        />
      </div>

      {errors.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-[9px] border border-destructive/40 bg-destructive/5 p-3 text-[12.5px] text-destructive">
          {errors.map((err) => (
            <li key={err}>• {err}</li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={loading} size="lg" className="rounded-[9px] px-6">
          {loading ? "Submitting…" : "Submit lead"}
        </Button>
        <span className="text-[12px] text-muted-foreground">
          Creates a scored lead in the SDR worklist.
        </span>
      </div>
    </form>
  );
}
