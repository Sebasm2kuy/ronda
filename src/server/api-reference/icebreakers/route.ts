import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// GET: lista de rompehielos mezclada (para rotar durante la ronda)
export async function GET() {
  const items = await db.icebreaker.findMany({ orderBy: { order: "asc" } });
  const shuffled = items
    .map((i) => ({ text: i.text, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((i) => i.text);
  return NextResponse.json({ questions: shuffled });
}
