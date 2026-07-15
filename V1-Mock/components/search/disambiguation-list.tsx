import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export interface DisambiguationMatch {
  id: string;
  name: string;
  domain: string;
  ownerId: string;
  ownerName: string;
}

export function DisambiguationList({
  matches,
  originalQuery,
}: {
  matches: DisambiguationMatch[];
  originalQuery: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Multiple accounts matched — select one:</p>
      {matches.map((match) => (
        <Link
          key={match.id}
          href={`/account/${match.id}?q=${encodeURIComponent(originalQuery)}`}
        >
          <Card className="border-white/10 bg-card/80 hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{match.name}</p>
                <p className="text-sm text-muted-foreground">{match.domain}</p>
              </div>
              <p className="text-sm text-muted-foreground">Owner: {match.ownerName}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
