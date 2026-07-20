import type { CompanyResearchResult } from "@/lib/research/types";
import type { CompanyIntel } from "@/lib/research/company-intel";
import { formatCurrency } from "@/lib/workit/format";

/**
 * Company Research / Growth / Hiring cards. Extracted from the standalone
 * /account/[id]/work-it route so the route and the in-page Work-it reveal
 * render the exact same surface (no drift). Pure presentational — all data
 * is computed server-side and passed in (works in a server or client tree).
 */
export function CompanyResearchCards({
  research,
  intel,
  sourceLabel,
  revenueAmount,
  fteCount,
  industry,
}: {
  research: CompanyResearchResult;
  intel: CompanyIntel | null;
  sourceLabel: string;
  revenueAmount: number | null;
  fteCount: number | null;
  industry: string;
}) {
  return (
    <>
      {research.errors.length > 0 && (
        <div className="mb-5 rounded-[14px] border border-warning-bg bg-warning-bg/30 px-5 py-3 text-[13px] text-warning">
          {research.errors.map((err) => (
            <p key={err}>{err}</p>
          ))}
        </div>
      )}

      <div className="mb-5 rounded-[14px] border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">Company Research</h2>
          <span className="text-[12.5px] text-muted-foreground">{sourceLabel}</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            <div className="rounded-[11px] border border-border bg-background px-4 py-3.5">
              <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                Revenue
              </label>
              <div className="text-base font-bold">{formatCurrency(revenueAmount)}</div>
              {intel ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Source: {intel.revenue.source}
                </p>
              ) : (
                research.revenue.taxYear && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Tax year {research.revenue.taxYear} · Source: {research.revenue.source}
                  </p>
                )
              )}
              {!intel && research.form990Url && (
                <a
                  href={research.form990Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[11px] text-link hover:underline"
                >
                  View Form 990 →
                </a>
              )}
            </div>
            <div className="rounded-[11px] border border-border bg-background px-4 py-3.5">
              <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                Full-Time Employees
              </label>
              <div className="text-base font-bold">{fteCount ?? "Not available"}</div>
              {intel ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Source: {intel.employees.source}
                </p>
              ) : (
                research.employeeCount.note && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {research.employeeCount.note}
                  </p>
                )
              )}
            </div>
            <div className="rounded-[11px] border border-border bg-background px-4 py-3.5">
              <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                Data Source
              </label>
              <div className="text-[13.5px] font-bold">{sourceLabel}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Industry: {industry}
                {intel ? " — non-nonprofit routing" : " — 990 routing"}
              </p>
            </div>
          </div>

          {intel && (
            <div className="mt-3.5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
              <div className="rounded-[11px] border border-border bg-background px-4 py-3">
                <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                  HQ Location
                </label>
                <div className="text-[13px] font-bold">{intel.hqLocation ?? "Not found"}</div>
              </div>
              <div className="rounded-[11px] border border-border bg-background px-4 py-3">
                <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                  Entities / Locations
                </label>
                <div className="text-[13px] font-bold">{intel.locations ?? "Not found"}</div>
              </div>
              <div className="rounded-[11px] border border-border bg-background px-4 py-3">
                <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                  Parent Account
                </label>
                <div className="text-[13px] font-bold">{intel.parentAccount ?? "None found"}</div>
              </div>
              <div className="rounded-[11px] border border-border bg-background px-4 py-3">
                <label className="mb-0.5 block text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
                  Recent Funding
                </label>
                <div className="text-[13px] font-bold">
                  {intel.funding
                    ? `${intel.funding.round} — ${intel.funding.amount} (${intel.funding.date})`
                    : "None found"}
                </div>
                {intel.funding && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {intel.funding.investors}
                  </p>
                )}
              </div>
            </div>
          )}

          {research.revenueStream.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-[13px] font-bold">
                Revenue stream{" "}
                <span className="font-normal text-muted-foreground">
                  — tax year {research.revenue.taxYear}, per Form 990
                </span>
              </p>
              {research.revenueStream.map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between gap-3 border-b border-dashed border-border py-1 text-[12.5px] last:border-b-0"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">
                    {formatCurrency(item.amount)} ({item.pct}%)
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3.5 text-[13.5px]">
            <b>Company history:</b>{" "}
            {research.companyHistory ?? "No history could be extracted from public sources."}
          </p>
        </div>
      </div>

      {intel && (
        <div className="mb-5 rounded-[14px] border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <h2 className="text-[15.5px] font-semibold">Growth Signals</h2>
            <span className="text-[12.5px] text-muted-foreground">
              New hires, new locations, changes to the business
            </span>
          </div>
          <div className="p-5">
            {intel.growthSignals.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No recent growth signals found.
              </p>
            ) : (
              intel.growthSignals.map((signal) => (
                <div
                  key={signal}
                  className="flex items-center gap-2.5 border-b border-dashed border-border py-2 text-[13px] last:border-b-0"
                >
                  <div className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-primary-soft text-[13px]">
                    📈
                  </div>
                  <div>{signal}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {intel && (
        <div className="mb-5 rounded-[14px] border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <h2 className="text-[15.5px] font-semibold">Finance Hiring Signals</h2>
            <span className="text-[12.5px] text-muted-foreground">
              Open finance roles — job descriptions parsed for software &amp; skill clues
            </span>
          </div>
          <div className="p-5">
            {intel.hiringSignals.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No open finance roles found.
              </p>
            ) : (
              intel.hiringSignals.map((job) => (
                <div
                  key={job.role}
                  className="border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0"
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
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
