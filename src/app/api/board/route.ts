import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sanitiseSubmission } from "@/lib/board/moderate";
import { insertBoardSubmission, listPublicSubmissions } from "@/lib/board/repo";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== "string" || typeof body.body !== "string") {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const raw = { title: body.title, body: body.body };
  const sanitised = sanitiseSubmission(raw);
  const row = await insertBoardSubmission(db, sanitised);
  return NextResponse.json(row, { status: 201 });
}

export async function GET() {
  const rows = await listPublicSubmissions(db);
  return NextResponse.json(rows);
}
