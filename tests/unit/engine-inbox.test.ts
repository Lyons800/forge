import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb } from "../helpers/testdb";
import { insertBoardSubmission, listApprovedSubmissions } from "../../src/lib/board/repo";

describe("engine inbox — listApprovedSubmissions (security-critical filter)", () => {
  let db: Awaited<ReturnType<typeof makeTestDb>>;

  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("returns ONLY approved rows — never pending or needs_review", async () => {
    // Insert one of each status
    await insertBoardSubmission(db, { title: "Pending item", body: "body", status: "pending" });
    await insertBoardSubmission(db, { title: "Approved item", body: "body", status: "approved" });
    await insertBoardSubmission(db, { title: "Needs review item", body: "body", status: "needs_review" });

    const results = await listApprovedSubmissions(db);

    // Must return exactly the one approved row
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Approved item");
    expect(results[0].status).toBe("approved");
  });

  it("returns empty array when no approved submissions exist", async () => {
    await insertBoardSubmission(db, { title: "Pending", body: "body", status: "pending" });
    await insertBoardSubmission(db, { title: "Needs review", body: "body", status: "needs_review" });

    const results = await listApprovedSubmissions(db);
    expect(results).toHaveLength(0);
  });

  it("returns multiple approved rows in newest-first order", async () => {
    // Insert with explicit order — newest gets higher id/later createdAt
    await insertBoardSubmission(db, { title: "First approved", body: "body", status: "approved" });
    await insertBoardSubmission(db, { title: "Second approved", body: "body", status: "approved" });
    await insertBoardSubmission(db, { title: "Pending noise", body: "body", status: "pending" });

    const results = await listApprovedSubmissions(db);
    expect(results).toHaveLength(2);
    // Newest-first: Second approved should come before First approved
    expect(results[0].title).toBe("Second approved");
    expect(results[1].title).toBe("First approved");
  });
});
