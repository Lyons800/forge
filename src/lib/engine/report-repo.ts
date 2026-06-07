import { engineReports, changelogEntries } from "../../../drizzle/schema";
import { desc, gte } from "drizzle-orm";

// Minimal structural interface compatible with both node-postgres drizzle and PGlite drizzle.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyDb = {
  insert: (table: any) => {
    values: (v: any) => { returning: () => Promise<any[]> };
  };
  select: () => {
    from: (table: any) => any;
  };
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function insertReport(
  db: AnyDb,
  report: { summary: string; detail: string }
) {
  const [row] = await db
    .insert(engineReports)
    .values({ summary: report.summary, detail: report.detail })
    .returning();
  return row as typeof engineReports.$inferSelect;
}

export async function listReports(db: AnyDb, limit?: number) {
  // I5: push the limit to the DB via Drizzle .limit() instead of in-memory .slice()
  const query = db
    .select()
    .from(engineReports)
    .orderBy(desc(engineReports.runDate));
  const rows = (await (limit !== undefined ? query.limit(limit) : query)) as (typeof engineReports.$inferSelect)[];
  return rows;
}

/**
 * Count changelog entries with shippedAt >= sinceDate.
 */
export async function countShipsSince(db: AnyDb, sinceDate: Date): Promise<number> {
  const rows = (await db
    .select()
    .from(changelogEntries)
    .where(gte(changelogEntries.shippedAt, sinceDate))) as unknown[];
  return rows.length;
}

/**
 * Count changelog entries shipped in the last 7 days (rolling window).
 * Computes the cutoff date internally so callers don't need Date.now() during render.
 */
export async function countShipsLast7Days(db: AnyDb): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return countShipsSince(db, cutoff);
}
