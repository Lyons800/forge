import { engineReports, changelogEntries } from "../../../drizzle/schema";
import { desc, gte } from "drizzle-orm";

// Minimal structural interface compatible with both node-postgres drizzle and PGlite drizzle.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyDb = {
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
  const rows = (await db
    .select()
    .from(engineReports)
    .orderBy(desc(engineReports.runDate))) as (typeof engineReports.$inferSelect)[];
  return limit !== undefined ? rows.slice(0, limit) : rows;
}

/**
 * Count changelog entries with shippedAt >= sinceDate.
 * The caller computes the rolling 7-day window (e.g. new Date(Date.now() - 7 * 86400_000)).
 */
export async function countShipsSince(db: AnyDb, sinceDate: Date): Promise<number> {
  const rows = (await db
    .select()
    .from(changelogEntries)
    .where(gte(changelogEntries.shippedAt, sinceDate))) as unknown[];
  return rows.length;
}
