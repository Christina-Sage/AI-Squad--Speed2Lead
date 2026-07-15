import Link from "next/link";
import { notFound } from "next/navigation";
import { getSalesforceProvider } from "@/lib/salesforce/provider";
import { researchAccount } from "@/lib/research/research-account";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatCurrency(amount: number | null): string {
  if (amount === null) return "Not available";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    amount,
  );
}

export default async function WorkItPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;

  const provider = getSalesforceProvider();
  const bundle = await provider.getAccountBundle(accountId);
  if (!bundle) {
    notFound();
  }

  const { account, leads, contacts } = bundle;
  const research = await researchAccount(account, leads, contacts);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={`/account/${accountId}?q=${encodeURIComponent(account.domain)}`}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          ← Back to {account.name}
        </Link>
        <h1 className="font-heading mt-2 text-2xl font-black">Account Research</h1>
        <p className="text-sm text-muted-foreground">
          {research.dataSource === "propublica" &&
            `Matched to "${research.organizationName}" (EIN ${research.ein}) on ProPublica Nonprofit Explorer.`}
          {research.dataSource === "website" && `Researched from ${account.domain}.`}
          {research.dataSource === "none" && "No research data could be found for this account."}
        </p>
      </div>

      {research.errors.length > 0 && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="space-y-1 pt-4 text-sm text-warning">
            {research.errors.map((err) => (
              <p key={err}>{err}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-white/10 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{formatCurrency(research.revenue.amount)}</p>
            {research.revenue.taxYear && (
              <p className="mt-1 text-xs text-muted-foreground">
                Tax year {research.revenue.taxYear} · Source: {research.revenue.source}
              </p>
            )}
            {research.form990Url && (
              <a
                href={research.form990Url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline"
              >
                View Form 990 →
              </a>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Full-Time Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {research.employeeCount.count ?? "Not available"}
            </p>
            {research.employeeCount.note && (
              <p className="mt-1 text-xs text-muted-foreground">{research.employeeCount.note}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/80">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Data Source</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={research.dataSource === "none" ? "secondary" : "default"}>
              {research.dataSource === "propublica" && "ProPublica (990)"}
              {research.dataSource === "website" && "Company website"}
              {research.dataSource === "none" && "None found"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {research.revenueStream.length > 0 && (
        <Card className="border-white/10 bg-card/80">
          <CardHeader>
            <CardTitle>Revenue Stream</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Breakdown of tax year {research.revenue.taxYear} total revenue, per Form 990.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {research.revenueStream.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="text-muted-foreground">
                  {formatCurrency(item.amount)} ({item.pct}%)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-white/10 bg-card/80">
        <CardHeader>
          <CardTitle>Company History</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {research.companyHistory ?? "No history could be extracted from public sources."}
        </CardContent>
      </Card>

      {research.flaggedContacts.length > 0 && (
        <Card className="border-warning/40 bg-warning/10">
          <CardHeader>
            <CardTitle className="text-warning">
              {research.flaggedContacts.length} ICP contact
              {research.flaggedContacts.length > 1 ? "s" : ""} not in Salesforce
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {research.flaggedContacts.map((c) => (
              <p key={`${c.name}-${c.title}`}>
                <span className="font-medium">{c.name}</span> — {c.title}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-white/10 bg-card/80">
        <CardHeader>
          <CardTitle>Found Contacts</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            ICP matches only, best-effort extraction from{" "}
            {research.dataSource === "propublica" ? "the 990 filing" : "public website content"}
            {" "}— verify manually before acting on it.
          </p>
        </CardHeader>
        <CardContent>
          {research.foundContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ICP-matching contacts found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>In Salesforce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {research.foundContacts.map((c) => (
                  <TableRow key={`${c.name}-${c.title}`}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>{c.source === "990" ? "Form 990" : "Website"}</TableCell>
                    <TableCell>
                      {c.inSalesforce ? (
                        <Badge variant="secondary">In CRM</Badge>
                      ) : (
                        <Badge variant="warning">Not in CRM</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card/80">
        <CardHeader>
          <CardTitle>Existing Salesforce Contacts &amp; Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 && contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts or leads on this account.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {contacts.map((c) => (
                <li key={c.id}>
                  <span className="font-medium">{c.name}</span> — {c.title}{" "}
                  <span className="text-muted-foreground">(Contact)</span>
                </li>
              ))}
              {leads.map((l) => (
                <li key={l.id}>
                  <span className="font-medium">{l.name}</span> — {l.title}{" "}
                  <span className="text-muted-foreground">(Lead)</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
