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

// Saved Worklists: a BDR saves an uploaded campaign list (Tradeshow, Former DQ,
// …) with a name and an expiration date, then works it over time. A list is
// per-user (private). It leaves the active picker when every account in it has
// been worked (derived from the audit log) or when it is archived; expiry and
// archival are purged after a grace period. accountIds is the saved membership.
export const savedWorklists = pgTable("saved_worklists", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  // Optional campaign/source label (e.g. "Tradeshow", "DQ recycle").
  source: text("source"),
  accountIds: jsonb("account_ids").notNull(),

  // Null = no expiry. On this date the list is archived, then purged after a grace period.
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  // Set when the list is archived (manually, or auto once fully worked).
  archivedAt: timestamp("archived_at", { withTimezone: true }),
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

// Retained (unused): the lead-capture web form and its intake/routing code have
// been removed, so nothing reads or writes this table anymore. The table itself
// is intentionally left in place — dropping it would require a schema migration.
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
