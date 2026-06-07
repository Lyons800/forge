import { changelogEntries } from "../../../drizzle/schema";
import { desc } from "drizzle-orm";

// Minimal structural interface compatible with both node-postgres drizzle and PGlite drizzle.
type AnyDb = {
  insert: (table: unknown) => {
    values: (v: unknown) => { returning: () => Promise<unknown[]> };
  };
  select: () => {
    from: (table: unknown) => {
      orderBy: (col: unknown) => Promise<unknown[]>;
    };
  };
};

export async function insertChangelogEntry(db: AnyDb, entry: { title: string; body: string }) {
  const [row] = await db
    .insert(changelogEntries)
    .values({ title: entry.title, body: entry.body })
    .returning();
  return row as typeof changelogEntries.$inferSelect;
}

export async function listChangelogEntries(db: AnyDb) {
  const rows = await db
    .select()
    .from(changelogEntries)
    .orderBy(desc(changelogEntries.shippedAt));
  return rows as (typeof changelogEntries.$inferSelect)[];
}
