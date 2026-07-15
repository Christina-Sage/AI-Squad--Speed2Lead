CREATE TABLE "account_overrides" (
	"account_id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"owner_name" text NOT NULL,
	"abm_nurture_status" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
