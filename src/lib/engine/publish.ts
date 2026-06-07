import { insertReport } from "./report-repo";
import { insertChangelogEntry } from "../changelog/repo";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyDb = {
  insert: (table: any) => {
    values: (v: any) => { returning: () => Promise<any[]> };
  };
  select: () => {
    from: (table: any) => any;
  };
  /** Drizzle transaction — used to make publishShip atomic (I4). */
  transaction: <T>(fn: (tx: AnyDb) => Promise<T>) => Promise<T>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Publish a daily ship: persists the engine report AND appends a changelog entry
 * so the ship appears on the public Build-Log.
 *
 * Wrapped in a Drizzle transaction (I4) so both inserts are all-or-nothing —
 * prevents a stale changelog entry with no matching report (or vice-versa) from
 * corrupting the ship cap accounting.
 *
 * PGlite (used in unit tests) fully supports transactions via savepoints, so
 * existing tests continue to pass without modification.
 */
export async function publishShip(
  db: AnyDb,
  opts: {
    reportSummary: string;
    reportDetail: string;
    changelogTitle: string;
    changelogBody: string;
  }
) {
  return db.transaction(async (tx) => {
    const report = await insertReport(tx, {
      summary: opts.reportSummary,
      detail: opts.reportDetail,
    });

    const entry = await insertChangelogEntry(tx, {
      title: opts.changelogTitle,
      body: opts.changelogBody,
    });

    return { report, entry };
  });
}
