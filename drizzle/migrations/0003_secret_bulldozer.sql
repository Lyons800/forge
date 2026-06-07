CREATE TABLE "engine_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_date" timestamp DEFAULT now() NOT NULL,
	"summary" text NOT NULL,
	"detail" text NOT NULL
);
