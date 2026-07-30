import { getConvex } from "@/lib/convex/server-client";
import { api } from "@/convex/_generated/api";

export interface AccountOverride {
  ownerId: string;
  ownerName: string;
  abmNurtureStatus: string | null;
}

export async function getOverride(accountId: string): Promise<AccountOverride | undefined> {
  const row = await getConvex().query(api.overrides.get, { accountId });
  return row ?? undefined;
}

export async function getAllOverrides(): Promise<Map<string, AccountOverride>> {
  const rows = await getConvex().query(api.overrides.getAll, {});
  return new Map(
    rows.map((r) => [
      r.accountId,
      { ownerId: r.ownerId, ownerName: r.ownerName, abmNurtureStatus: r.abmNurtureStatus },
    ]),
  );
}

export async function setOverride(accountId: string, override: AccountOverride): Promise<void> {
  await getConvex().mutation(api.overrides.set, {
    accountId,
    ownerId: override.ownerId,
    ownerName: override.ownerName,
    abmNurtureStatus: override.abmNurtureStatus,
  });
}
