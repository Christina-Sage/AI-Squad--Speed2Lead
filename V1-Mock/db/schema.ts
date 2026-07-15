import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  team: text("team").notNull().default("BDR"),

  searchInput: text("search_input").notNull(),
  searchType: text("search_type").notNull(),

  accountId: text("account_id"),
  domain: text("domain"),
  accountName: text("account_name"),

  finalStatus: text("final_status"),
  reason: text("reason"),
  reasonCodes: jsonb("reason_codes"),

  action: text("action").notNull().default("SEARCH"),
  assignmentDetails: jsonb("assignment_details"),
});

// Persists "Assign to Me" mutations on top of the in-memory mock fixtures.
// Needed because the in-memory store is per-serverless-instance: without this,
// an assignment made by one Lambda invocation is invisible to the next request
// if it lands on a different instance.
export const accountOverrides = pgTable("account_overrides", {
  accountId: text("account_id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  ownerName: text("owner_name").notNull(),
  abmNurtureStatus: text("abm_nurture_status"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
