import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb } from "../helpers/testdb";
import { publishShip } from "../../src/lib/engine/publish";
import { listReports } from "../../src/lib/engine/report-repo";
import { listChangelogEntries } from "../../src/lib/changelog/repo";

describe("publishShip — daily report + changelog round-trip", () => {
  let db: Awaited<ReturnType<typeof makeTestDb>>;

  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("inserts an engine report AND a changelog entry in one call", async () => {
    const { report, entry } = await publishShip(db, {
      reportSummary: "Shipped 2 features today",
      reportDetail: "Feature A: fixed login. Feature B: add export.",
      changelogTitle: "v0.2.0 — Login fix + CSV export",
      changelogBody: "We fixed the login flow and added CSV export.",
    });

    // Both returned objects have ids
    expect(report.id).toBeTypeOf("number");
    expect(entry.id).toBeTypeOf("number");

    // Round-trip: report persisted
    const reports = await listReports(db);
    expect(reports).toHaveLength(1);
    expect(reports[0].summary).toBe("Shipped 2 features today");
    expect(reports[0].detail).toBe("Feature A: fixed login. Feature B: add export.");

    // Round-trip: changelog entry persisted
    const entries = await listChangelogEntries(db);
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("v0.2.0 — Login fix + CSV export");
    expect(entries[0].body).toBe("We fixed the login flow and added CSV export.");
  });

  it("report has a runDate and changelog entry has a shippedAt", async () => {
    const { report, entry } = await publishShip(db, {
      reportSummary: "Daily summary",
      reportDetail: "Details here",
      changelogTitle: "Changelog title",
      changelogBody: "Changelog body",
    });

    expect(report.runDate).toBeInstanceOf(Date);
    expect(entry.shippedAt).toBeInstanceOf(Date);
  });

  it("each publishShip call appends independently", async () => {
    await publishShip(db, {
      reportSummary: "Day 1",
      reportDetail: "Details 1",
      changelogTitle: "Ship 1",
      changelogBody: "Body 1",
    });
    await publishShip(db, {
      reportSummary: "Day 2",
      reportDetail: "Details 2",
      changelogTitle: "Ship 2",
      changelogBody: "Body 2",
    });

    const reports = await listReports(db);
    expect(reports).toHaveLength(2);

    const entries = await listChangelogEntries(db);
    expect(entries).toHaveLength(2);
  });
});
