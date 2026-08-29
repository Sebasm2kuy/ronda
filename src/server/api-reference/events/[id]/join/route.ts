import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// Reservar lugar en un evento
export async function POST(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const event = await db.event.findUnique({ where: { id }, include: { attendees: true } });
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });

  const already = event.attendees.some((a) => a.userId === user.id);
  if (already) return NextResponse.json({ ok: true, joined: true });

  if (event.attendees.length >= event.capacity) {
    return NextResponse.json({ error: "Se agotaron los lugares" }, { status: 409 });
  }

  await db.eventAttendee.create({ data: { eventId: event.id, userId: user.id } });
  return NextResponse.json({ ok: true, joined: true });
}

// Liberar lugar
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  await db.eventAttendee.deleteMany({ where: { eventId: id, userId: user.id } });
  return NextResponse.json({ ok: true, joined: false });
}
