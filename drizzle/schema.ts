import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// APP-plane table (engine may later add tables/columns here, subject to Atlas lint)
export const changelogEntries = pgTable("changelog_entries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  shippedAt: timestamp("shipped_at").defaultNow().notNull(),
});
