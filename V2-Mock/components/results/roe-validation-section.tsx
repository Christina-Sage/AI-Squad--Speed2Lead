import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RoeResult } from "@/lib/workability/roe";
import type { RoeScope } from "@/lib/workability/engine";
import type { Team } from "@/lib/teams";

export function RoeValidationSection({
  roe,
  scope,
  team,
}: {
  roe: RoeResult;
  scope: RoeScope;
  team: Team;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>ROE Validation</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Checking {scope} ({team})
          </p>
        </div>
        <Badge variant={roe.status === "PASS" ? "default" : "destructive"}>{roe.status}</Badge>
      </CardHeader>
      {roe.status === "FAIL" && (
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Activity Date</TableHead>
                <TableHead>Days Since Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roe.violatingRecords.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.recordType}</TableCell>
                  <TableCell>{r.owner}</TableCell>
                  <TableCell>{new Date(r.lastActivityDate).toLocaleDateString()}</TableCell>
                  <TableCell>{r.daysSinceActivity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
