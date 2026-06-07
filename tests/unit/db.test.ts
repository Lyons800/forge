import { describe, it, expect } from "vitest";
import { makeTestDb } from "../helpers/testdb";
import { changelogEntries } from "../../drizzle/schema";

describe("db: changelog_entries", () => {
  it("inserts and reads back an entry with a default shippedAt", async () => {
    const db = await makeTestDb();
    await db.insert(changelogEntries).values({ title: "Hello", body: "World" });
    const rows = await db.select().from(changelogEntries);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Hello");
    expect(rows[0].shippedAt).toBeInstanceOf(Date);
  });
});
