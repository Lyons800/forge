import { changelogEntries } from "../../../drizzle/schema";
import { desc } from "drizzle-orm";

// Minimal structural interface compatible with both node-postgres drizzle and PGlite drizzle.
// Using `any` for table/column parameters is intentional — this shim exists to keep
// the function signatures compatible with both the real Drizzle client and the PGlite
// test double without importing Drizzle types directly.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyDb = {
  insert: (table: any) => {
    values: (v: any) => { returning: () => Promise<any[]> };
  };
  select: () => {
    from: (table: any) => {
      orderBy: (col: any) => Promise<any[]>;
    };
  };
};
/* eslint-enable @typescript-eslint/no-explicit-any */

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
