"use client";

import { useEffect, useState } from "react";
import type { AccountScore, ScorePillar } from "@/lib/scoring/scoring";
import {
  analyzedKey,
  CHECK_BASE_DELAY_MS,
  CHECK_STEP_MS,
  VERDICT_EXTRA_MS,
} from "@/components/results/dedupe-checklist";

const CHECK_COUNT = 6;

function Step({
  icon,
  name,
  weight,
  pillar,
  animate,
}: {
  icon: string;
  name: string;
  weight: string;
  pillar: ScorePillar;
  animate: boolean;
}) {
  return (
    <div className="relative flex gap-4 pb-6 last:pb-1 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-9 [&:not(:last-child)]:before:bottom-0 [&:not(:last-child)]:before:left-[15px] [&:not(:last-child)]:before:w-0.5 [&:not(:last-child)]:before:bg-line [&:not(:last-child)]:before:content-['']">
      <div className="z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-primary-soft text-[15px]">
        {icon}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="mb-0.5 flex items-baseline gap-2.5">
          <h4 className="text-sm font-bold">{name}</h4>
          <span className="text-[13px] font-bold text-primary">{pillar.value}/100</span>
          <span className="text-[11px] text-muted-foreground">weight {weight}</span>
        </div>
        <div className="my-2 h-1.5 overflow-hidden rounded-full border border-border bg-background">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{ width: animate ? `${pillar.value}%` : "0%" }}
          />
        </div>
        {pillar.signals.map((s) => (
          <div
            key={s.label}
            className="flex justify-between gap-3 border-b border-dashed border-border py-1 text-[12.5px] last:border-b-0"
          >
            <span className="text-muted-foreground">{s.label}</span>
            <span className={`text-right font-medium ${s.good ? "text-success" : "text-destructive"}`}>
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScoringCard({ accountId, score }: { accountId: string; score: AccountScore }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const already = sessionStorage.getItem(analyzedKey(accountId)) === "1";
    const delay = already ? 60 : CHECK_BASE_DELAY_MS + CHECK_COUNT * CHECK_STEP_MS + VERDICT_EXTRA_MS;
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [accountId]);

  return (
    <div
      className={`rounded-[14px] border border-border bg-card shadow-sm transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <h2 className="text-[15.5px] font-semibold">Should I work it?</h2>
        <span className="text-[12.5px] text-muted-foreground">Fit, Intent, Workability</span>
        <span className="flex-1" />
        <span className="rounded-full bg-primary-soft px-3.5 py-1 text-[13px] font-bold text-primary">
          {score.priority} · {score.tier} priority
        </span>
      </div>
      <div className="p-5 pl-6">
        <Step icon="🎯" name="Fit" weight="40%" pillar={score.fit} animate={visible} />
        <Step icon="📈" name="Intent" weight="35%" pillar={score.intent} animate={visible} />
        <Step icon="🛠️" name="Workability" weight="25%" pillar={score.workability} animate={visible} />
      </div>
    </div>
  );
}
