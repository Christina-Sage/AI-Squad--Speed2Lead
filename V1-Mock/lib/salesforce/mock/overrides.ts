import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accountOverrides } from "@/db/schema";

export interface AccountOverride {
  ownerId: string;
  ownerName: string;
  abmNurtureStatus: string | null;
}

export async function getOverride(accountId: string): Promise<AccountOverride | undefined> {
  const [row] = await db
    .select()
    .from(accountOverrides)
    .where(eq(accountOverrides.accountId, accountId))
    .limit(1);
  return row;
}

export async function getAllOverrides(): Promise<Map<string, AccountOverride>> {
  const rows = await db.select().from(accountOverrides);
  return new Map(rows.map((r) => [r.accountId, r]));
}

export async function setOverride(accountId: string, override: AccountOverride): Promise<void> {
  await db
    .insert(accountOverrides)
    .values({ accountId, ...override })
    .onConflictDoUpdate({
      target: accountOverrides.accountId,
      set: { ...override, updatedAt: new Date() },
    });
}
