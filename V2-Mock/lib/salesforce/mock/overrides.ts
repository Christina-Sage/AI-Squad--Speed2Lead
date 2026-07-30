import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export interface AccountOverride {
  ownerId: string;
  ownerName: string;
  abmNurtureStatus: string | null;
}

export async function getOverride(accountId: string): Promise<AccountOverride | undefined> {
  const row = await fetchQuery(api.accountOverrides.get, { accountId });
  return row ?? undefined;
}

export async function getAllOverrides(): Promise<Map<string, AccountOverride>> {
  const rows = await fetchQuery(api.accountOverrides.getAll, {});
  return new Map(
    rows.map((r) => [
      r.accountId,
      { ownerId: r.ownerId, ownerName: r.ownerName, abmNurtureStatus: r.abmNurtureStatus },
    ]),
  );
}

export async function setOverride(accountId: string, override: AccountOverride): Promise<void> {
  await fetchMutation(api.accountOverrides.set, { accountId, ...override });
}
