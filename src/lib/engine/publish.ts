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
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Publish a daily ship: persists the engine report AND appends a changelog entry
 * so the ship appears on the public Build-Log.
 *
 * Thin composition of insertReport + insertChangelogEntry — no transaction
 * wrapping needed at this scale; both inserts are idempotent enough for the engine.
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
  const report = await insertReport(db, {
    summary: opts.reportSummary,
    detail: opts.reportDetail,
  });

  const entry = await insertChangelogEntry(db, {
    title: opts.changelogTitle,
    body: opts.changelogBody,
  });

  return { report, entry };
}
