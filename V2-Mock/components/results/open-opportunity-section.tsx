import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OpenOppResult } from "@/lib/workability/open-opportunity";

export function OpenOpportunitySection({ openOpp }: { openOpp: OpenOppResult }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Open Opportunity Validation</CardTitle>
        <Badge variant={openOpp.status === "PASS" ? "default" : "destructive"}>
          {openOpp.status}
        </Badge>
      </CardHeader>
      {openOpp.status === "FAIL" && (
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunity Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Created Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openOpp.openOpportunities.map((o, i) => (
                <TableRow key={i}>
                  <TableCell>{o.name}</TableCell>
                  <TableCell>{o.owner}</TableCell>
                  <TableCell>{o.stage}</TableCell>
                  <TableCell>{o.source}</TableCell>
                  <TableCell>{o.createdDate ? new Date(o.createdDate).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
