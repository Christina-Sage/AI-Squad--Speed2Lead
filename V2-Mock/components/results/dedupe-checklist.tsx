"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toaster";
import type { DedupeCheck, FinalStatus } from "@/lib/workability/engine";

export const CHECK_BASE_DELAY_MS = 260;
export const CHECK_STEP_MS = 300;
export const VERDICT_EXTRA_MS = 150;

export function analyzedKey(entityId: string) {
  return `dedupe-analyzed-${entityId}`;
}

function badgeFor(check: DedupeCheck): { text: string; cls: string } {
  const green = "bg-success-bg text-success";
  const red = "bg-destructive-bg text-destructive";
  const amber = "bg-warning-bg text-warning";
  const grey = "bg-muted text-muted-foreground";
  if (check.state === "na") return { text: "N/A", cls: grey };
  if (check.badgeType === "yn") {
    return check.state === "fail" ? { text: "Yes", cls: red } : { text: "No", cls: green };
  }
  if (check.state === "fail") return { text: "Fail", cls: red };
  if (check.state === "warn") return { text: "Review", cls: amber };
  return { text: "Pass", cls: green };
}

/**
 * Shared "Can I work it?" verdict banner + animated six-check checklist. Used by
 * both the account detail and the SDR lead detail (build-plan step 6). Account
 * actions render by default; pass `actions` to supply entity-specific controls
 * (e.g. for a lead).
 */
export function DedupeChecklist({
  accountId,
  checks,
  finalStatus,
  reason,
  recommendation,
  ownerName,
  isCurrentOwner,
  salesforceUrl,
  title = "Can I work it?",
  subtitle = "Six-check compact checklist",
  runningTitle = "Running the six checks…",
  actions,
}: {
  accountId: string;
  checks: DedupeCheck[];
  finalStatus: FinalStatus;
  reason: string;
  recommendation: string;
  ownerName: string;
  isCurrentOwner: boolean;
  salesforceUrl: string;
  title?: string;
  subtitle?: string;
  runningTitle?: string;
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const ok = finalStatus !== "NOT WORKABLE";

  useEffect(() => {
    const already = sessionStorage.getItem(analyzedKey(accountId)) === "1";
    if (already) {
      setRevealed(checks.length);
      setDone(true);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    checks.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealed(i + 1), CHECK_BASE_DELAY_MS + i * CHECK_STEP_MS));
    });
    timers.push(
      setTimeout(() => {
        setDone(true);
        sessionStorage.setItem(analyzedKey(accountId), "1");
      }, CHECK_BASE_DELAY_MS + checks.length * CHECK_STEP_MS + VERDICT_EXTRA_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [accountId, checks.length]);

  async function assignToMe() {
    setAssigning(true);
    setAssignError(null);
    try {
      const res = await fetch("/api/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (!data.success) {
        setAssignError(data.error ?? "Failed to assign account.");
        return;
      }
      toast("Account assigned to you");
      router.refresh();
    } catch {
      setAssignError("Something went wrong while assigning this account.");
    } finally {
      setAssigning(false);
    }
  }

  const failLabels = checks.filter((c) => c.state === "fail").map((c) => c.label);

  return (
    <>
      {/* Verdict banner */}
      <div
        className={`mb-5 flex items-start gap-3.5 rounded-[14px] border px-5 py-4 ${
          !done
            ? "border-border bg-card"
            : ok
              ? finalStatus === "WORKABLE WITH REVIEW"
                ? "border-warning-bg bg-warning-bg/30"
                : "border-success-bg bg-success-soft"
              : "border-destructive-bg bg-destructive-tint"
        }`}
      >
        <div
          className={`flex size-[38px] shrink-0 items-center justify-center rounded-full text-[19px] font-extrabold ${
            !done
              ? "bg-background text-muted-foreground"
              : ok
                ? finalStatus === "WORKABLE WITH REVIEW"
                  ? "bg-warning-bg text-warning"
                  : "bg-success-bg text-success"
                : "bg-destructive-bg text-destructive"
          }`}
        >
          {!done ? "…" : ok ? (finalStatus === "WORKABLE WITH REVIEW" ? "!" : "✓") : "✕"}
        </div>
        <div>
          <h3 className="font-heading text-base font-black tracking-[0.3px]">
            {!done ? runningTitle : finalStatus}
          </h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {!done
              ? "Salesforce (Intacct + Global) · Fusion · VAR/channel — one pass, evidence below."
              : (
                  <>
                    {reason} <b className="text-foreground">Recommendation: {recommendation}</b>
                  </>
                )}
          </p>
        </div>
      </div>

      {/* Checklist card */}
      <div className="mb-6 rounded-[14px] border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">{title}</h2>
          <span className="text-[12.5px] text-muted-foreground">{subtitle}</span>
          <span className="flex-1" />
          {done && (
            <span
              className={`rounded-full px-3.5 py-1 text-[13px] font-bold tracking-[0.4px] uppercase ${
                ok
                  ? finalStatus === "WORKABLE WITH REVIEW"
                    ? "bg-warning-bg text-warning"
                    : "bg-success-bg text-success"
                  : "bg-destructive-bg text-destructive"
              }`}
            >
              {ok ? (finalStatus === "WORKABLE WITH REVIEW" ? "Review" : "Workable") : "Don’t work"}
            </span>
          )}
        </div>
        <div className="p-5">
          <div className="overflow-hidden rounded-[11px] border border-border">
            {checks.map((check, i) => {
              const shown = i < revealed;
              const badge = badgeFor(check);
              return (
                <div
                  key={check.key}
                  className={`flex items-center gap-3 border-t border-border px-4 py-2.5 transition-colors first:border-t-0 ${
                    shown && check.state === "fail" ? "bg-destructive-tint" : ""
                  }`}
                >
                  <div
                    className={`flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                      !shown
                        ? "border-[1.5px] border-line text-transparent"
                        : check.state === "fail"
                          ? "bg-destructive-bg text-destructive"
                          : check.state === "warn"
                            ? "bg-warning-bg text-warning"
                            : check.state === "na"
                              ? "bg-muted text-muted-foreground"
                              : "bg-success-bg text-success"
                    }`}
                  >
                    {shown
                      ? check.state === "fail"
                        ? "✕"
                        : check.state === "warn"
                          ? "!"
                          : check.state === "na"
                            ? "–"
                            : "✓"
                      : ""}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold">
                      {check.label}{" "}
                      <span className="ml-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                        {check.question}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {shown ? check.reason : "Checking…"}
                    </div>
                  </div>
                  {!shown ? (
                    <div className="size-[15px] shrink-0 animate-spin rounded-full border-2 border-border border-t-primary" />
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] uppercase ${badge.cls}`}
                    >
                      {badge.text}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div
            className={`mt-4 flex flex-wrap items-center gap-3 transition-opacity duration-300 ${
              done ? "opacity-100" : "opacity-0"
            }`}
          >
            {actions ?? (
              <>
                {ok ? (
                  <>
                    {isCurrentOwner ? (
                      <button
                        disabled
                        className="inline-flex items-center gap-1.5 rounded-[9px] bg-success-bg px-4 py-2 text-[13.5px] font-semibold text-success"
                      >
                        ✓ Assigned to you
                      </button>
                    ) : (
                      <button
                        onClick={assignToMe}
                        disabled={assigning}
                        className="inline-flex items-center gap-1.5 rounded-[9px] border border-primary bg-primary px-4 py-2 text-[13.5px] font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-45"
                      >
                        {assigning ? "Assigning…" : "Assign to me"}
                      </button>
                    )}
                    <Link
                      href={`/account/${accountId}/work-it`}
                      className="inline-flex items-center gap-1.5 rounded-[9px] border border-border bg-card px-4 py-2 text-[13.5px] font-semibold hover:border-muted-foreground"
                    >
                      Work it →
                    </Link>
                  </>
                ) : (
                  <button
                    onClick={() => toast(`Routed to ${ownerName} with your note`)}
                    className="inline-flex items-center gap-1.5 rounded-[9px] border border-border bg-card px-4 py-2 text-[13.5px] font-semibold hover:border-muted-foreground"
                  >
                    Notify owner / request handoff
                  </button>
                )}
                <a
                  href={salesforceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-[9px] border border-border bg-card px-4 py-2 text-[13.5px] font-semibold hover:border-muted-foreground"
                >
                  Open in CRM
                </a>
                {failLabels.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Blocked by: {failLabels.join(", ")}
                  </span>
                )}
                {assignError && <span className="text-xs text-destructive">{assignError}</span>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
