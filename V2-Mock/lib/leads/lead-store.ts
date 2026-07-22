import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { capturedLeads } from "@/db/schema";
import type { SdrLead } from "@/lib/leads/types";
import type { PriorityGroup } from "@/lib/priority";
import type { Product } from "@/lib/products";

/**
 * Persistence for web-form-captured SDR leads (`/simulate`). The in-memory mock
 * store is per-serverless-instance, so a lead created by one request would be
 * invisible to the next if it landed on a different instance — this table makes
 * captured leads durable and shared, the same way `account_overrides` does for
 * "Assign to Me". Fixture worklist leads stay in code; only form-created leads
 * live here.
 */

type CapturedLeadRow = typeof capturedLeads.$inferSelect;

function rowToLead(row: CapturedLeadRow): SdrLead {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    // Captured inbound leads are not matched to an account yet.
    accountId: null,
    ownerName: row.ownerName,
    status: row.status,
    priorityGroup: row.priorityGroup as PriorityGroup,
    product: row.product as Product,
    fit: row.fit,
    intent: row.intent,
    workability: row.workability,
    score: row.score,
    company: row.company,
    email: row.email,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function insertCapturedLead(lead: SdrLead): Promise<void> {
  await db.insert(capturedLeads).values({
    id: lead.id,
    name: lead.name,
    title: lead.title,
    company: lead.company ?? null,
    email: lead.email ?? null,
    source: lead.source ?? null,
    ownerName: lead.ownerName,
    status: lead.status,
    priorityGroup: lead.priorityGroup,
    product: lead.product,
    fit: lead.fit,
    intent: lead.intent,
    workability: lead.workability,
    score: lead.score,
  });
}

/** All captured leads, newest first. */
export async function listCapturedLeads(): Promise<SdrLead[]> {
  const rows = await db.select().from(capturedLeads).orderBy(desc(capturedLeads.createdAt));
  return rows.map(rowToLead);
}

export async function getCapturedLead(id: string): Promise<SdrLead | null> {
  const [row] = await db.select().from(capturedLeads).where(eq(capturedLeads.id, id)).limit(1);
  return row ? rowToLead(row) : null;
}
