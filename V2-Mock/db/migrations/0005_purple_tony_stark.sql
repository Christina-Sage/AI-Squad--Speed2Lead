CREATE TABLE "saved_worklists" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"source" text,
	"account_ids" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"archived_at" timestamp with time zone
);
