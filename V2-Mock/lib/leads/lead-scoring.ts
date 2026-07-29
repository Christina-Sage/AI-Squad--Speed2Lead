import type { SdrLead } from "@/lib/leads/types";
import type { AccountBundle } from "@/lib/salesforce/types";
import { evaluateWorkability } from "@/lib/workability/engine";
import { SCORE_WEIGHTS, scoreAccount, tierFor, type AccountScore, type ScorePillar } from "@/lib/scoring/scoring";

/**
 * "Should I work it?" score for an SDR lead. Returns the same AccountScore shape
 * the ScoringCard renders, so the lead and account detail views stay consistent
 * (build-plan step 6). Fit/intent are fixture-driven; the priority is recomputed
 * from the weights so it always reconciles with the pillar values shown.
 *
 * When the lead is linked to a real account, the account's rich detail is
 * borrowed so the SDR fit card shows the SAME Fit & Firmographics, Intent
 * breakdown, and Disqualified Opportunity History as the BDR account view — the
 * lead keeps its own headline pillar values, but the evidence sections match.
 */
export function scoreLead(lead: SdrLead, accountBundle: AccountBundle | null): AccountScore {
  const account = accountBundle?.account ?? null;

  const fit: ScorePillar = {
    value: lead.fit,
    signals: account
      ? [
          { label: "ICP match", value: `${account.industry} · linked account`, good: true },
          { label: "Product fit", value: "Intacct core financials", good: true },
          { label: "Persona", value: `${lead.title} — economic buyer`, good: true },
          { label: "Vertical", value: account.industry, good: true },
        ]
      : [
          { label: "ICP match", value: "Lead-level — account unknown", good: true },
          { label: "Product fit", value: "Intacct core financials", good: true },
          { label: "Persona", value: `${lead.title} — economic buyer`, good: true },
        ],
  };

  const intent: ScorePillar = {
    value: lead.intent,
    signals: [
      { label: "Web intent", value: lead.intent >= 60 ? "Active page views this week" : "Low recent activity", good: lead.intent >= 60 },
      { label: "Outreach activity", value: lead.intent >= 60 ? "Engaged with outreach" : "Never contacted", good: lead.intent >= 60 },
      { label: "Source", value: "Inbound (SDR)", good: true },
    ],
  };

  const workability: ScorePillar = {
    value: lead.workability,
    signals: [
      {
        label: "Account association",
        value: account ? `Linked to ${account.name}` : "Standalone lead — no account",
        good: !!account,
      },
      { label: "Last activity", value: "Never worked", good: true },
      { label: "ROE", value: "Clear — no competing claim", good: true },
    ],
  };

  // Borrow the linked account's evidence so the Intent breakdown and
  // Disqualified Opportunity History render identically to the BDR account view.
  // (Fit & Firmographics already comes from the account research in the lead
  // work-it route.) scoreAccount returns null for de-dupe-blocked accounts —
  // those show no fit card in the BDR view either, so there is nothing to match.
  if (accountBundle) {
    const accountResult = evaluateWorkability(accountBundle);
    const accountScore = scoreAccount(accountBundle, accountResult);
    if (accountScore) {
      intent.detail = accountScore.intent.detail;
      workability.workDetail = accountScore.workability.workDetail;
    }
  }

  const priority = Math.round(
    fit.value * SCORE_WEIGHTS.fit +
      intent.value * SCORE_WEIGHTS.intent +
      workability.value * SCORE_WEIGHTS.workability,
  );

  return { fit, intent, workability, priority, tier: tierFor(priority) };
}
