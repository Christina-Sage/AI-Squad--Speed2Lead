import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export interface DisambiguationMatch {
  id: string;
  name: string;
  // Account matches
  domain?: string | null;
  ownerId?: string;
  ownerName?: string;
  // Lead matches
  title?: string;
  accountName?: string | null;
}

export function DisambiguationList({
  matches,
  originalQuery,
  kind = "account",
}: {
  matches: DisambiguationMatch[];
  originalQuery: string;
  kind?: "account" | "lead";
}) {
  const isLead = kind === "lead";
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {isLead ? "Multiple leads matched — select one:" : "Multiple accounts matched — select one:"}
      </p>
      {matches.map((match) => {
        const href = isLead
          ? `/lead/${match.id}?q=${encodeURIComponent(originalQuery)}`
          : `/account/${match.id}?q=${encodeURIComponent(originalQuery)}`;
        const secondary = isLead
          ? [match.title, match.accountName].filter(Boolean).join(" · ")
          : match.domain;
        return (
          <Link key={match.id} href={href}>
            <Card className="border-border bg-card hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{match.name}</p>
                  {secondary && <p className="text-sm text-muted-foreground">{secondary}</p>}
                </div>
                {!isLead && match.ownerName && (
                  <p className="text-sm text-muted-foreground">Owner: {match.ownerName}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
