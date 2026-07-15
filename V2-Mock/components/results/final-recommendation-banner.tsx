import { cn } from "@/lib/utils";
import type { FinalStatus } from "@/lib/workability/engine";

const STYLES: Record<FinalStatus, string> = {
  WORKABLE: "bg-primary/10 border-primary/60 text-primary",
  "WORKABLE WITH REVIEW": "bg-warning/10 border-warning/60 text-warning",
  "NOT WORKABLE": "bg-destructive/10 border-destructive/60 text-destructive",
};

export function FinalRecommendationBanner({
  status,
  reason,
  recommendation,
}: {
  status: FinalStatus;
  reason: string;
  recommendation: string;
}) {
  return (
    <div className={cn("rounded-lg border-2 p-4 space-y-1", STYLES[status])}>
      <p className="font-heading text-lg font-bold">{status}</p>
      <p className="text-sm">{reason}</p>
      <p className="text-sm font-medium">Recommendation: {recommendation}</p>
    </div>
  );
}
