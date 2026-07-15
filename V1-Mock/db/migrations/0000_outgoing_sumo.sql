CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"search_input" text NOT NULL,
	"search_type" text NOT NULL,
	"account_id" text,
	"domain" text,
	"account_name" text,
	"final_status" text,
	"reason" text,
	"reason_codes" jsonb,
	"action" text DEFAULT 'SEARCH' NOT NULL,
	"assignment_details" jsonb
);
