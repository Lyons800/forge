import { describe, it, expect, beforeAll } from "vitest";
import { makeTestDb } from "../helpers/testdb";
import { insertChangelogEntry, listChangelogEntries } from "@/lib/changelog/repo";

let db: Awaited<ReturnType<typeof makeTestDb>>;

beforeAll(async () => {
  db = await makeTestDb();
});

describe("changelog repo", () => {
  it("inserts an entry and returns the created row", async () => {
    const row = await insertChangelogEntry(db, {
      title: "Shipped dark mode",
      body: "Dark mode is now available.",
    });
    expect(row.id).toBeTypeOf("number");
    expect(row.title).toBe("Shipped dark mode");
    expect(row.body).toBe("Dark mode is now available.");
    expect(row.shippedAt).toBeInstanceOf(Date);
  });

  it("lists entries newest-first", async () => {
    await insertChangelogEntry(db, { title: "Old feature", body: "Older." });
    await insertChangelogEntry(db, { title: "New feature", body: "Newer." });

    const rows = await listChangelogEntries(db);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    // Newest-first: shippedAt descending
    for (let i = 0; i < rows.length - 1; i++) {
      expect(rows[i].shippedAt.getTime()).toBeGreaterThanOrEqual(
        rows[i + 1].shippedAt.getTime()
      );
    }
  });

  it("round-trips title and body", async () => {
    const title = "Round-trip check";
    const body = "Body text here.";
    await insertChangelogEntry(db, { title, body });
    const rows = await listChangelogEntries(db);
    const found = rows.find((r) => r.title === title);
    expect(found).toBeDefined();
    expect(found!.body).toBe(body);
  });
});
