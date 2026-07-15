import { Skeleton } from "@/components/ui/skeleton";

export default function WorkItLoading() {
  return (
    <div>
      <div className="mb-4 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-72" />
      </div>
      <p className="mb-4 text-xs text-muted-foreground italic">
        Researching company history, revenue, and contacts from public sources — this can take a
        few seconds…
      </p>
      <Skeleton className="mb-4 h-[84px] rounded-[14px]" />
      <Skeleton className="mb-4 h-[140px] rounded-[14px]" />
      <Skeleton className="h-[180px] rounded-[14px]" />
    </div>
  );
}
