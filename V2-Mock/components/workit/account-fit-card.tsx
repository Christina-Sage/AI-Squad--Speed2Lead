"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toaster";
import type { AccountScore } from "@/lib/scoring/scoring";
import type { CompanyIntel } from "@/lib/research/company-intel";
import type { CompanyResearchResult } from "@/lib/research/types";
import type { PanelContact, PanelExistingRecord } from "@/components/workit/work-it-panel";
import { formatCurrency } from "@/lib/workit/format";

/**
 * "Should I work it?" account-fit card (mockup C). One box that consolidates the
 * eight account-fit-audit checks after Work-it: the overall score + pillars up
 * top, then the firmographics, intent, contacts, growth and hiring signals that
 * used to live in the separate Company Research / Growth Signals / Finance
 * Hiring / Found Contacts cards — each labelled with the tool it came from.
 */

type Status = "good" | "watch";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
}

function ConfirmedPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.3px] text-success uppercase">
      ✓ Confirmed
    </span>
  );
}

function Dot({ status }: { status: Status }) {
  return (
    <span
      className={`inline-block size-[7px] shrink-0 rounded-full ${
        status === "good" ? "bg-success" : "bg-warning"
      }`}
    />
  );
}

function Cell({
  label,
  value,
  source,
  status = "good",
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  source?: React.ReactNode;
  status?: Status;
  className?: string;
}) {
  return (
    <div className={`rounded-[11px] border border-border bg-background px-4 py-3.5 ${className}`}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Dot status={status} />
        <span className="text-[10.5px] font-bold tracking-[0.5px] text-muted-foreground uppercase">
          {label}
        </span>
      </div>
      <div className="text-[15px] leading-tight font-bold">{value}</div>
      {source && <p className="mt-1 text-[11px] text-muted-foreground">{source}</p>}
    </div>
  );
}

function Pillar({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="min-w-[86px]">
      <span className="block text-[10.5px] font-bold tracking-[0.5px] text-muted-foreground uppercase">
        {label}
      </span>
      <b className="text-[18px] font-bold">{value}</b>
      <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${warn ? "bg-warning" : "bg-primary"}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SignalRow({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-[12.5px] last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right font-medium ${good ? "text-success" : "text-destructive"}`}>
        {value}
      </span>
    </div>
  );
}

export function AccountFitCard({
  accountId,
  score,
  accountName,
  domain,
  industry,
  sourceLabel,
  revenueAmount,
  fteCount,
  intel,
  research,
  foundContacts,
  existingRecords,
  initialAddedNames,
}: {
  accountId: string;
  score: AccountScore;
  accountName: string;
  domain: string;
  industry: string;
  sourceLabel: string;
  revenueAmount: number | null;
  fteCount: number | null;
  intel: CompanyIntel | null;
  research: CompanyResearchResult;
  foundContacts: PanelContact[];
  existingRecords: PanelExistingRecord[];
  initialAddedNames: string[];
}) {
  const toast = useToast();
  const [added, setAdded] = useState<Set<string>>(
    () => new Set(initialAddedNames.map((n) => n.toLowerCase())),
  );
  const [busy, setBusy] = useState<string | null>(null);

  const isAdded = (c: PanelContact) => c.inSalesforce || added.has(c.name.toLowerCase());

  async function addContact(c: PanelContact) {
    setBusy(c.name);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, name: c.name, title: c.title }),
      });
      const data = await res.json();
      if (!data.success) {
        toast(data.error ?? "Failed to create contact");
        return;
      }
      setAdded((prev) => new Set(prev).add(c.name.toLowerCase()));
      toast(`Confirmed — added to Salesforce: ${c.name}`);
    } catch {
      toast("Failed to confirm contact");
    } finally {
      setBusy(null);
    }
  }

  const revenueSource = intel
    ? "ZoomInfo"
    : research.revenue.source === "990"
      ? `Form 990${research.revenue.taxYear ? ` · FY${research.revenue.taxYear}` : ""}`
      : research.revenue.source === "website"
        ? "Company website"
        : "Not found";
  const fteSource = intel
    ? "LinkedIn Sales Navigator"
    : research.employeeCount.source === "990"
      ? "Form 990"
      : research.employeeCount.source === "website"
        ? "Company website"
        : "Not found";

  // Salesforce cross-reference outcome for the contacts banner + row pills.
  // Existing SFDC records and research finds that matched Salesforce are
  // "confirmed"; a research find with no Salesforce match needs the rep's
  // review and stays flagged until they Confirm it (writing it to Salesforce).
  const confirmedFoundCount = foundContacts.filter(isAdded).length;
  const reviewCount = foundContacts.length - confirmedFoundCount;
  const confirmedCount = existingRecords.length + confirmedFoundCount;
  const hasContacts = existingRecords.length > 0 || foundContacts.length > 0;
  const growthSignals = intel?.growthSignals ?? [];
  const hiringSignals = intel?.hiringSignals ?? [];

  const sectionLabel = "mb-2 text-[11px] font-bold tracking-[0.5px] text-muted-foreground uppercase";

  return (
    <div className="mb-5 overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
      {/* Overall score header */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-border px-5 py-5">
        <div className="flex items-baseline gap-1">
          <span className="font-heading text-[42px] leading-none font-black text-primary">
            {score.priority}
          </span>
          <span className="text-[15px] text-muted-foreground">/100 · {score.tier}</span>
        </div>
        <div className="mr-auto">
          <h2 className="font-heading text-[17px] font-black">{accountName}</h2>
          <p className="text-[12.5px] text-muted-foreground">
            {industry} · {domain}
          </p>
        </div>
        <div className="flex flex-wrap gap-6">
          <Pillar label="Fit · 40%" value={score.fit.value} />
          <Pillar label="Intent · 35%" value={score.intent.value} />
          <Pillar label="Work · 25%" value={score.workability.value} warn={score.workability.value < 70} />
        </div>
      </div>

      <div className="flex flex-col gap-6 p-5">
        {/* Firmographics — industry / revenue / employees + intel extras */}
        <div>
          <p className={sectionLabel}>Fit &amp; firmographics</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Cell label="Industry" value={industry} source={sourceLabel} />
            <Cell
              label="Revenue"
              value={formatCurrency(revenueAmount)}
              source={`Source: ${revenueSource}`}
              status={revenueAmount === null ? "watch" : "good"}
            />
            <Cell
              label="Full-time employees"
              value={fteCount ?? "Not available"}
              source={`Source: ${fteSource}`}
              status={fteCount === null ? "watch" : "good"}
            />
          </div>
          {intel && (
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Cell label="HQ location" value={intel.hqLocation ?? "Not found"} />
              <Cell label="Entities / locations" value={intel.locations ?? "Not found"} />
              <Cell label="Parent account" value={intel.parentAccount ?? "None found"} />
              <Cell
                label="Recent funding"
                value={
                  intel.funding ? `${intel.funding.round} — ${intel.funding.amount}` : "None found"
                }
                source={intel.funding ? `${intel.funding.date} · ${intel.funding.investors}` : undefined}
              />
            </div>
          )}
        </div>

        {/* Intent */}
        <div>
          <p className={sectionLabel}>Intent</p>
          <div className="rounded-[11px] border border-border bg-background px-4 py-2">
            {score.intent.signals.map((s) => (
              <SignalRow key={s.label} label={s.label} value={s.value} good={s.good} />
            ))}
          </div>
        </div>

        {/* Contacts — checked against Salesforce: matches confirmed, new finds flagged for review */}
        <div>
          <p className={sectionLabel}>
            Contacts{" "}
            <span className="font-normal normal-case">— ICP contacts, checked against Salesforce</span>
          </p>

          {hasContacts && (
            <div className="mb-3 flex items-start gap-2.5 rounded-[11px] border border-success-bg bg-success-soft px-4 py-2.5">
              <span className="mt-px flex size-[20px] shrink-0 items-center justify-center rounded-full bg-success-bg text-[12px] font-extrabold text-success">
                ✓
              </span>
              <p className="text-[12.5px] leading-snug">
                Checked Salesforce on <b>{accountName}</b> — {confirmedCount} ICP contact
                {confirmedCount === 1 ? "" : "s"} confirmed and pre-selected.
                {reviewCount > 0
                  ? ` ${reviewCount} ${reviewCount === 1 ? "needs" : "need"} your review.`
                  : " None need your review."}
              </p>
            </div>
          )}

          <div className="rounded-[11px] border border-border bg-background">
            {!hasContacts ? (
              <p className="px-4 py-3 text-xs text-muted-foreground italic">
                No contacts on file and no ICP matches found in public sources.
              </p>
            ) : (
              <>
                {existingRecords.map((r) => (
                  <div
                    key={`${r.name}-${r.kind}`}
                    className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {initials(r.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold">{r.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {r.title} · {r.kind}
                      </span>
                    </span>
                    <ConfirmedPill />
                  </div>
                ))}
                {foundContacts.map((c) => {
                  const confirmed = isAdded(c);
                  return (
                    <div
                      key={`${c.name}-${c.title}`}
                      className={`flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 ${
                        confirmed ? "" : "bg-warning-bg/25"
                      }`}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                        {initials(c.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-semibold">
                          {c.name}{" "}
                          {c.isIcpMatch && (
                            <span className="ml-1 rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-bold tracking-[0.4px] text-success uppercase">
                              ICP
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {c.title} · {c.source === "990" ? "Form 990" : "Website"}
                        </span>
                      </span>
                      {confirmed ? (
                        <ConfirmedPill />
                      ) : (
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.3px] text-warning uppercase">
                            ⚠ Needs your review
                          </span>
                          <button
                            className="rounded-[7px] border border-border bg-card px-2.5 py-1 text-[12.5px] font-semibold hover:border-muted-foreground disabled:opacity-45"
                            disabled={busy === c.name}
                            onClick={() => addContact(c)}
                          >
                            {busy === c.name ? "Confirming…" : "Confirm"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Growth signals */}
        <div>
          <p className={sectionLabel}>
            Growth signals{" "}
            <span className="font-normal normal-case">— new hires, new locations, changes to the business</span>
          </p>
          <div className="rounded-[11px] border border-border bg-background px-4 py-1.5">
            {growthSignals.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground italic">No recent growth signals found.</p>
            ) : (
              growthSignals.map((signal) => (
                <div
                  key={signal}
                  className="flex items-center gap-2.5 border-b border-dashed border-border py-2 text-[13px] last:border-b-0"
                >
                  <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-primary-soft text-[13px]">
                    📈
                  </span>
                  <span>{signal}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Finance hiring signals */}
        {hiringSignals.length > 0 && (
          <div>
            <p className={sectionLabel}>
              Finance hiring signals{" "}
              <span className="font-normal normal-case">— open finance roles parsed for software clues</span>
            </p>
            <div className="rounded-[11px] border border-border bg-background px-4">
              {hiringSignals.map((job) => (
                <div
                  key={job.role}
                  className="border-b border-border py-3 last:border-b-0"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13.5px] font-bold">{job.role}</span>
                    <span className="text-[11.5px] text-muted-foreground">
                      Posted {job.postedDaysAgo} days ago · {job.source}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted-foreground italic">
                    &ldquo;{job.descriptionSnippet}&rdquo;
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {job.clues.map((clue) => (
                      <span
                        key={clue}
                        className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11.5px] font-bold text-primary"
                      >
                        {clue}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workability note + company history */}
        <p className="text-[13px] leading-relaxed">
          <b>Workability:</b>{" "}
          {score.workability.signals.map((s, i) => (
            <span key={s.label}>
              {i > 0 && " · "}
              {s.label}: <span className={s.good ? "text-success" : "text-warning"}>{s.value}</span>
            </span>
          ))}
          <br />
          <b>Company history:</b>{" "}
          <span className="text-muted-foreground">
            {research.companyHistory ?? "No history could be extracted from public sources."}
          </span>
        </p>
      </div>
    </div>
  );
}
