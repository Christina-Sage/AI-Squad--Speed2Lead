import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkabilityResult } from "@/lib/workability/engine";

const customerBadgeVariant: Record<string, "default" | "destructive" | "warning"> = {
  PASS: "default",
  WARNING: "warning",
  BLOCKED: "destructive",
};

const tamBadgeVariant: Record<string, "default" | "warning"> = {
  PASS: "default",
  WARNING: "warning",
};

export function CustomerValidationSection({ result }: { result: WorkabilityResult }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="border-white/10 bg-card/80">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Customer Validation</CardTitle>
          <Badge variant={customerBadgeVariant[result.customer_status]}>
            {result.customer_status}
          </Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Type: {result.type}</CardContent>
      </Card>
      <Card className="border-white/10 bg-card/80">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>TAM Validation</CardTitle>
          <Badge variant={tamBadgeVariant[result.tam_validation_status]}>
            {result.tam_validation_status}
          </Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">TAM: {result.tam_status}</CardContent>
      </Card>
    </div>
  );
}
