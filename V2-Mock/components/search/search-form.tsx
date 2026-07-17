"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DisambiguationList, type DisambiguationMatch } from "@/components/search/disambiguation-list";

export function SearchForm() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<DisambiguationMatch[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setMatches(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      if (data.matchType === "single") {
        // Open the result inline in the worklist feed (build-plan step 7). The
        // WorklistExplorer listens for this event; the standalone /account route
        // still resolves for pasted/bookmarked links (step 8).
        window.dispatchEvent(
          new CustomEvent("dedupe:open-detail", {
            detail: { kind: "account", id: data.accountId, label: query },
          }),
        );
        setQuery("");
        return;
      }

      if (data.matchType === "multiple") {
        setMatches(data.matches);
        return;
      }

      setError(`No account found for "${query}".`);
    } catch {
      setError("Something went wrong while searching. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 text-left">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-[10px] border border-border bg-card p-1.5 pl-4 shadow-sm focus-within:border-primary"
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter Website/Domain"
          className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button type="submit" disabled={loading} size="lg" className="rounded-[9px] px-5">
          {loading ? "Analyzing..." : "Analyze Account"}
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        Examples: abc.org &middot; 0015Y00002ABC123 &middot; ABC Foundation
      </p>

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      {matches && <DisambiguationList matches={matches} originalQuery={query} />}
    </div>
  );
}
