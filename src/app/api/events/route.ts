import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { EventInfo } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const events = await db.event.findMany({
    include: { attendees: true },
    orderBy: { createdAt: "asc" },
  });

  const list: EventInfo[] = events.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    emoji: e.emoji,
    description: e.description,
    dateLabel: e.dateLabel,
    capacity: e.capacity,
    attendees: e.attendees.length,
    spotsLeft: Math.max(0, e.capacity - e.attendees.length),
    joined: e.attendees.some((a) => a.userId === user.id),
  }));

  return NextResponse.json({ events: list });
}
