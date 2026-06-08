import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listChangelogEntries } from "@/lib/changelog/repo";

// Force dynamic so the response always reflects current DB state.
export const dynamic = "force-dynamic";

const FEED_LIMIT = 50;

export async function GET() {
  // Guard: if db is null (no DATABASE_URL in build / preview), return empty feed.
  if (!db) {
    return NextResponse.json({ entries: [], count: 0 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = await listChangelogEntries(db as any);
  const entries = all.slice(0, FEED_LIMIT).map((row) => ({
    title: row.title,
    body: row.body,
    shippedAt: row.shippedAt.toISOString(),
  }));

  return NextResponse.json(
    { entries, count: entries.length },
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
