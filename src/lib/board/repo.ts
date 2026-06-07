import { boardSubmissions } from "../../../drizzle/schema";
import { inArray, desc } from "drizzle-orm";

// Minimal interface for a drizzle db instance that can insert/select.
// Using a structural type avoids `any` while still being compatible with both
// node-postgres (production) and PGlite (tests).
type AnyDb = {
  insert: (table: unknown) => {
    values: (v: unknown) => { returning: () => Promise<unknown[]> };
  };
  select: () => {
    from: (table: unknown) => {
      where: (cond: unknown) => {
        orderBy: (col: unknown) => Promise<unknown[]>;
      };
      orderBy: (col: unknown) => Promise<unknown[]>;
    };
  };
};

export async function insertBoardSubmission(
  db: AnyDb,
  submission: { title: string; body: string; status: string }
) {
  const [row] = await db
    .insert(boardSubmissions)
    .values(submission)
    .returning();
  return row as typeof boardSubmissions.$inferSelect;
}

/**
 * List ONLY pending and approved submissions — NEVER returns needs_review rows.
 */
export async function listPublicSubmissions(db: AnyDb) {
  const rows = await db
    .select()
    .from(boardSubmissions)
    .where(inArray(boardSubmissions.status, ["pending", "approved"]))
    .orderBy(desc(boardSubmissions.createdAt));
  return rows as (typeof boardSubmissions.$inferSelect)[];
}
