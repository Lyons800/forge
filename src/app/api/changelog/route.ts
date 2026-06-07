import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { insertChangelogEntry } from "@/lib/changelog/repo";

export async function POST(req: NextRequest) {
  // Require authenticated session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== "string" || typeof body.body !== "string") {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const title = body.title.trim();
  const entryBody = body.body.trim();
  if (!title || !entryBody) {
    return NextResponse.json({ error: "title and body must not be empty" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = await insertChangelogEntry(db as any, { title, body: entryBody });
  return NextResponse.json(row, { status: 201 });
}
