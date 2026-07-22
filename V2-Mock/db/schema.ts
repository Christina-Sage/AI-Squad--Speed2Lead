import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

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

// Leads created through the web-form simulation (`/simulate`). Persisted here
// so a captured lead survives serverless-instance recycling and shows up in the
// worklist across requests — the in-memory store alone is per-instance. Fixture
// worklist leads stay in code; only form-created leads live here.
export const capturedLeads = pgTable("captured_leads", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  name: text("name").notNull(),
  title: text("title").notNull(),
  company: text("company"),
  email: text("email"),
  source: text("source"),

  ownerName: text("owner_name").notNull().default("House Account"),
  status: text("status").notNull().default("Open - Not Contacted"),
  priorityGroup: text("priority_group").notNull(),
  product: text("product").notNull().default("Intacct"),

  fit: integer("fit").notNull(),
  intent: integer("intent").notNull(),
  workability: integer("workability").notNull(),
  score: integer("score").notNull(),
});
