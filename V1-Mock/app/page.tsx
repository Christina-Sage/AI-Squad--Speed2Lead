import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/search/search-form";
import { getSalesforceProvider } from "@/lib/salesforce/provider";

export default async function Home() {
  const provider = getSalesforceProvider();
  const accounts = await provider.listAccounts();

  return (
    <div className="hero-gradient">
      <div className="mx-auto max-w-3xl px-4 pt-20 pb-12 text-center">
        <h1 className="font-heading text-4xl font-black tracking-normal sm:text-5xl">
          Dedupe Engine
        </h1>
        <p className="mt-2 text-sm font-medium text-primary">
          Try: <span className="text-foreground/80">abc.org</span>
        </p>
        <div className="mt-6">
          <SearchForm />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-20">
        <p className="mb-4 text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Quick Search
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {accounts.map((account) => (
            <Card key={account.id} className="border-white/10 bg-card/80">
              <CardContent className="flex h-full flex-col justify-between gap-3 pt-2">
                <div>
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {account.domain} &middot; {account.type}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-fit rounded-full"
                  nativeButton={false}
                  render={
                    <Link href={`/account/${account.id}?q=${encodeURIComponent(account.domain)}`}>
                      Open
                    </Link>
                  }
                />

              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
