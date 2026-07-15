import Link from "next/link";
import { cookies } from "next/headers";
import { SearchForm } from "@/components/search/search-form";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { evaluateWorkability, blockedByLabel, type WorkabilityResult } from "@/lib/workability/engine";
import { scoreAccount, SCORE_WEIGHTS, type AccountScore } from "@/lib/scoring/scoring";
import { getCurrentTeam, TEAM_COOKIE } from "@/lib/teams";

interface WorklistEntry {
  result: WorkabilityResult;
  score: AccountScore | null;
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="w-[74px]">
      <div className="flex justify-between text-[10px] tracking-[0.3px] text-muted-foreground">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full border border-border bg-background">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default async function Home() {
  const provider = getSalesforceProvider();
  const cookieStore = await cookies();
  const team = getCurrentTeam(cookieStore.get(TEAM_COOKIE)?.value);

  const accounts = await provider.listAccounts();
  const entries: WorklistEntry[] = [];
  for (const { id } of accounts) {
    const bundle = await provider.getAccountBundle(id);
    if (!bundle) continue;
    const result = evaluateWorkability(bundle, team);
    entries.push({ result, score: scoreAccount(bundle, result) });
  }

  const workable = entries
    .filter((e) => e.score !== null)
    .sort((a, b) => b.score!.priority - a.score!.priority);
  const blocked = entries.filter((e) => e.score === null);

  return (
    <div>
      <div className="pt-2 pb-6 text-center">
        <h1 className="font-heading text-[26px] font-black">Can I work it? Should I work it?</h1>
        <p className="mt-1 text-muted-foreground">
          One verdict, with evidence, in under a minute — instead of 5 minutes across Salesforce,
          Fusion and VAR checks.
        </p>
        <div className="mx-auto mt-5 max-w-[560px]">
          <SearchForm />
        </div>
      </div>

      <div className="mb-6 rounded-[14px] border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">Today&rsquo;s Worklist</h2>
          <span className="text-[12.5px] text-muted-foreground">
            Ranked by &ldquo;Should I work it?&rdquo; score — Fit {SCORE_WEIGHTS.fit * 100}% · Intent{" "}
            {SCORE_WEIGHTS.intent * 100}% · Workability {SCORE_WEIGHTS.workability * 100}%
          </span>
        </div>
        {workable.map(({ result, score }, i) => (
          <Link
            key={result.account_id}
            href={`/account/${result.account_id}?q=${encodeURIComponent(result.domain)}`}
            className="flex items-center gap-3.5 border-t border-border px-5 py-3 first:border-t-0 hover:bg-background"
          >
            <div className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12.5px] font-bold text-primary">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">
                {result.account_name}{" "}
                {result.final_status === "WORKABLE WITH REVIEW" ? (
                  <span className="ml-1.5 rounded-full bg-warning-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] text-warning uppercase">
                    Review
                  </span>
                ) : (
                  <span className="ml-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] text-success uppercase">
                    Workable
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {result.domain} · {result.industry} · {result.type}
              </div>
            </div>
            <div className="hidden items-center gap-2.5 md:flex">
              <MiniBar label="Fit" value={score!.fit.value} />
              <MiniBar label="Intent" value={score!.intent.value} />
              <MiniBar label="Work" value={score!.workability.value} />
            </div>
            <div className="w-14 shrink-0 text-center">
              <b className="text-[17px]">{score!.priority}</b>
              <span className="block text-[10px] tracking-[0.5px] text-muted-foreground">
                {score!.tier} PRIORITY
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-[14px] border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="text-[15.5px] font-semibold">Blocked by de-dupe</h2>
          <span className="text-[12.5px] text-muted-foreground">
            Failed one or more of the six checks — open for the evidence
          </span>
        </div>
        {blocked.map(({ result }) => (
          <Link
            key={result.account_id}
            href={`/account/${result.account_id}?q=${encodeURIComponent(result.domain)}`}
            className="flex items-center gap-3.5 border-t border-border px-5 py-3 opacity-60 first:border-t-0 hover:bg-background hover:opacity-100"
          >
            <div className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-background text-[12.5px] font-bold text-muted-foreground">
              ✗
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">
                {result.account_name}{" "}
                <span className="ml-1.5 rounded-full bg-destructive-bg px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.4px] text-destructive uppercase">
                  Don&rsquo;t work
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {result.domain} · {result.industry} · {result.type}
              </div>
            </div>
            <div className="text-[11.5px] text-destructive">{blockedByLabel(result)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
