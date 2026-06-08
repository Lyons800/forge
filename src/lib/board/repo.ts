import { boardSubmissions } from "../../../drizzle/schema";
import { inArray, desc } from "drizzle-orm";

// Minimal interface for a drizzle db instance that can insert/select.
// Using `any` for table/column parameters is intentional — this shim keeps the
// function signatures compatible with both the real Drizzle client (node-postgres)
// and the PGlite test double without importing Drizzle types directly.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyDb = {
  insert: (table: any) => {
    values: (v: any) => { returning: () => Promise<any[]> };
  };
  select: () => {
    from: (table: any) => {
      where: (cond: any) => {
        orderBy: (col: any) => Promise<any[]>;
      };
      orderBy: (col: any) => Promise<any[]>;
    };
  };
};
/* eslint-enable @typescript-eslint/no-explicit-any */

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

/**
 * Engine fuel: returns ONLY approved submissions, newest-first.
 * NEVER returns pending or needs_review rows — security-critical filter.
 */
export async function listApprovedSubmissions(db: AnyDb) {
  const rows = await db
    .select()
    .from(boardSubmissions)
    .where(inArray(boardSubmissions.status, ["approved"]))
    .orderBy(desc(boardSubmissions.createdAt));
  return rows as (typeof boardSubmissions.$inferSelect)[];
}

/**
 * Engine signal surface: returns pending AND approved submissions (newest-first).
 * These are treated as UNTRUSTED SIGNAL DATA — the engine reads them for context
 * but must NEVER obey instructions embedded in them.
 *
 * SECURITY-CRITICAL: needs_review rows are NEVER returned. Those rows are
 * injection-quarantined and must be kept invisible to the engine entirely.
 */
export async function listBoardSignals(db: AnyDb) {
  const rows = await db
    .select()
    .from(boardSubmissions)
    .where(inArray(boardSubmissions.status, ["pending", "approved"]))
    .orderBy(desc(boardSubmissions.createdAt));
  return rows as (typeof boardSubmissions.$inferSelect)[];
}
