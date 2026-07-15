import Link from "next/link";
import { Button } from "@/components/ui/button";

export function WorkItButton({ accountId }: { accountId: string }) {
  return (
    <Button
      variant="secondary"
      nativeButton={false}
      render={<Link href={`/account/${accountId}/work-it`}>Work it?</Link>}
    />
  );
}
