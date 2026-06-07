CREATE TABLE "changelog_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"shipped_at" timestamp DEFAULT now() NOT NULL
);
