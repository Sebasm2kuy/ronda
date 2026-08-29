import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, toPublicUser } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// Detalle de una ronda (solo participantes)
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const round = await db.round.findUnique({ where: { id } });
  if (!round || (round.userAId !== user.id && round.userBId !== user.id)) {
    return NextResponse.json({ error: "Ronda no encontrada" }, { status: 404 });
  }

  const partnerId = round.userAId === user.id ? round.userBId : round.userAId;
  const partner = await db.user.findUnique({ where: { id: partnerId } });
  if (!partner) return NextResponse.json({ error: "Ronda no encontrada" }, { status: 404 });

  return NextResponse.json({
    round: { id: round.id, status: round.status, startedAt: round.startedAt.toISOString(), partner: toPublicUser(partner) },
  });
}
