import { ChevronRightIcon } from "lucide-react";
import type { AccountScore } from "@/lib/scoring/scoring";
import { getSubvertical, type CompanyIntel } from "@/lib/research/company-intel";
import type { CompanyResearchResult } from "@/lib/research/types";
import { formatCurrency } from "@/lib/workit/format";

/**
 * "Should I work it?" account-fit card (mockup C). One box that consolidates the
 * account-fit-audit checks after Work-it: the overall score + pillars up top,
 * then the firmographics, intent, growth and hiring signals that used to live in
 * the separate Company Research / Growth Signals / Finance Hiring cards — each
 * labelled with the tool it came from. Contacts have their own dedicated
 * Existing Contacts card in the work-it panel below.
 */

type Status = "good" | "watch";

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

/**
 * Growth-Signals-style detail row: a small icon chip + label, with an optional
 * right-aligned reading. Deliberately has no good/warning colour — Intent, Work
 * and Growth just state what is or isn't available; status colour is reserved
 * for Fit & Firmographics. Kept tight (py-1.5) to minimise scroll.
 */
function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  value?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-dashed border-border py-1.5 text-[13px] last:border-b-0">
      <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-primary-soft text-[13px]">
        {icon}
      </span>
      <span className="font-bold">{label}</span>
      {value !== undefined && value !== "" && (
        <span className="ml-auto pl-3 text-right text-muted-foreground">{value}</span>
      )}
    </div>
  );
}

export function AccountFitCard({
  score,
  accountName,
  domain,
  industry,
  sourceLabel,
  revenueAmount,
  fteCount,
  intel,
  research,
}: {
  score: AccountScore;
  accountName: string;
  domain: string;
  industry: string;
  sourceLabel: string;
  revenueAmount: number | null;
  fteCount: number | null;
  intel: CompanyIntel | null;
  research: CompanyResearchResult;
}) {
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

  // Sub-vertical inferred beneath the top-level industry (e.g. Manufacturing →
  // Food & Beverage). Seeded off the account name so it stays stable per account.
  const subvertical = getSubvertical(industry, accountName);

  const growthSignals = intel?.growthSignals ?? [];
  const hiringSignals = intel?.hiringSignals ?? [];

  const intentDetail = score.intent.detail;
  // The 6sense keyword/visit/stage rows below already cover "Web intent" and the
  // buying stage, and "Outreach activity" now lives under Work — so the extra
  // rows show only the genuinely-intent leftovers: ABM tier, recycled MQL, etc.
  const otherIntentSignals = score.intent.signals.filter(
    (s) =>
      s.label !== "Web intent" &&
      s.label !== "6sense Buying Stage" &&
      s.label !== "Outreach activity",
  );

  const workDetail = score.workability.workDetail;
  const contactSourceTotal = workDetail
    ? workDetail.contactSources.salesforce +
      workDetail.contactSources.zoomInfo +
      workDetail.contactSources.linkedIn
    : 0;

  const sectionLabel = "mb-1.5 text-[11px] font-bold tracking-[0.5px] text-muted-foreground uppercase";

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

      <div className="flex flex-col gap-4 p-5">
        {/* Firmographics — industry / revenue / employees + intel extras */}
        <div>
          <p className={sectionLabel}>Fit &amp; firmographics</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Cell
              label="Industry"
              value={subvertical ? `${industry} · ${subvertical}` : industry}
              source={sourceLabel}
            />
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

        {/* Intent — a scannable detail list (same row style as Growth signals). */}
        <div>
          <p className={sectionLabel}>Intent</p>
          <div className="rounded-[11px] border border-border bg-background px-4">
            {intentDetail ? (
              <>
                <Row
                  icon="🔍"
                  label="6Sense Keywords"
                  value={
                    intentDetail.keywords.length ? (
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {intentDetail.keywords.map((kw) => (
                          <span
                            key={kw}
                            className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11.5px] font-bold text-primary"
                          >
                            {kw}
                          </span>
                        ))}
                      </span>
                    ) : (
                      "No keyword surge detected"
                    )
                  }
                />
                <Row icon="🌐" label="6Sense Website Visits" value={intentDetail.websiteVisits.value} />
                <Row icon="📊" label="6Sense Buying Stage" value={intentDetail.buyingStage.value} />
                <Row icon="✉️" label="Eloqua / Email Campaigns" value={intentDetail.emailCampaigns.value} />
                <Row icon="🗂️" label="Folloze Data" value={intentDetail.folloze.value} />
                {otherIntentSignals.map((s) => (
                  <Row key={s.label} icon="📌" label={s.label} value={s.value} />
                ))}
              </>
            ) : (
              score.intent.signals.map((s) => (
                <Row key={s.label} icon="📌" label={s.label} value={s.value} />
              ))
            )}
          </div>
        </div>

        {/* Work — is there anyone to work, and prior disqualified-opp context.
            Same row style as Intent / Growth signals. */}
        <div>
          <p className={sectionLabel}>
            Work{" "}
            <span className="font-normal normal-case">— is there anyone to work, and prior disqualified opps</span>
          </p>
          {workDetail ? (
            <>
              <div className="rounded-[11px] border border-border bg-background px-4">
                <Row
                  icon="👥"
                  label="Contacts to work"
                  value={
                    contactSourceTotal > 0
                      ? `${contactSourceTotal} available · SF ${workDetail.contactSources.salesforce} · ZoomInfo ${workDetail.contactSources.zoomInfo} · LinkedIn ${workDetail.contactSources.linkedIn}`
                      : "None found"
                  }
                />
                <Row
                  icon="🎯"
                  label="ICP contact"
                  value={
                    workDetail.icpContact.found
                      ? `${workDetail.icpContact.name} — ${workDetail.icpContact.title} · ${workDetail.icpContact.source}`
                      : "No ICP persona identified"
                  }
                />
              </div>

              {workDetail.dqHistory.length > 0 && (
                <div className="mt-2.5">
                  <p className="mb-1 text-[10.5px] font-bold tracking-[0.5px] text-muted-foreground uppercase">
                    Disqualified opportunity history
                  </p>
                  <div className="rounded-[11px] border border-border bg-background px-4">
                    {workDetail.dqHistory.map((dq) => (
                      <details
                        key={dq.name}
                        className="group border-b border-dashed border-border last:border-b-0"
                      >
                        <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2 [&::-webkit-details-marker]:hidden">
                          <ChevronRightIcon className="size-3.5 shrink-0 translate-y-px text-muted-foreground transition-transform group-open:rotate-90" />
                          <span className="text-[12.5px] font-bold">{dq.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            Last stage: {dq.furthestStage}
                            {dq.closedAgo ? ` · closed ${dq.closedAgo}` : ""}
                          </span>
                          <span className="basis-full pl-[22px] text-[11.5px] text-muted-foreground group-open:hidden">
                            {dq.reason}
                          </span>
                        </summary>
                        <ul className="mb-2 space-y-0.5 pl-[22px] text-[11.5px] leading-snug text-muted-foreground">
                          <li>
                            <b className="font-bold text-foreground">Reason DQ&rsquo;d:</b> {dq.reason}
                          </li>
                          {dq.qualificationNotes && (
                            <li>
                              <b className="font-bold text-foreground">Notes:</b> {dq.qualificationNotes}
                            </li>
                          )}
                          {dq.problems && (
                            <li>
                              <b className="font-bold text-foreground">Problems:</b> {dq.problems}
                            </li>
                          )}
                          {dq.nextSteps && (
                            <li>
                              <b className="font-bold text-foreground">Next steps:</b> {dq.nextSteps}
                            </li>
                          )}
                        </ul>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {score.workability.signals.map((s, i) => (
                <span key={s.label}>
                  {i > 0 && " · "}
                  {s.label}: {s.value}
                </span>
              ))}
            </p>
          )}
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
                  className="flex items-center gap-2.5 border-b border-dashed border-border py-1.5 text-[13px] last:border-b-0"
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

        {/* Company history */}
        <p className="text-[13px] leading-relaxed">
          <b>Company history:</b>{" "}
          <span className="text-muted-foreground">
            {research.companyHistory ?? "No history could be extracted from public sources."}
          </span>
        </p>
      </div>
    </div>
  );
}
