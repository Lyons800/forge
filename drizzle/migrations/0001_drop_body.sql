-- Intentionally destructive: proves atlas migrate-lint gate blocks DROP COLUMN
ALTER TABLE "changelog_entries" DROP COLUMN "body";
