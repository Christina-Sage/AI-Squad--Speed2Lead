CREATE TABLE "captured_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"company" text,
	"email" text,
	"source" text,
	"owner_name" text DEFAULT 'House Account' NOT NULL,
	"status" text DEFAULT 'Open - Not Contacted' NOT NULL,
	"priority_group" text NOT NULL,
	"fit" integer NOT NULL,
	"intent" integer NOT NULL,
	"workability" integer NOT NULL,
	"score" integer NOT NULL
);
