import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, toPublicUser } from "@/lib/auth";
import { findPartner } from "@/lib/matching";

export const runtime = "nodejs";

// Entrar a la ronda: reserva una pareja inmediatamente y crea la ronda ACTIVA.
// El cliente muestra la animación de búsqueda mientras tanto.

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Perfil incompleto: exige presentación en video (o haberla salteado explícitamente
  // con foto cargada). Sin perfil completo no hay ronda.
  if (!user.photoUrl) {
    return NextResponse.json({ error: "Primero completá tu foto de perfil", code: "NO_PHOTO" }, { status: 400 });
  }

  // ¿Ya tiene una ronda activa? Reutilizarla.
  const existing = await db.round.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ userAId: user.id }, { userBId: user.id }],
    },
  });
  if (existing) {
    const partnerId = existing.userAId === user.id ? existing.userBId : existing.userAId;
    const partner = await db.user.findUnique({ where: { id: partnerId } });
    if (partner) {
      return NextResponse.json({ round: { id: existing.id, status: existing.status, startedAt: existing.startedAt.toISOString(), partner: toPublicUser(partner) } });
    }
  }

  const partner = await findPartner(user);
  if (!partner) {
    return NextResponse.json({ error: "Ahora no hay nadie disponible. Probá en unos minutos.", code: "NO_PARTNER" }, { status: 503 });
  }

  const round = await db.$transaction(async (tx) => {
    const r = await tx.round.create({
      data: { userAId: user.id, userBId: partner.id, status: "ACTIVE" },
    });
    await tx.user.update({ where: { id: user.id }, data: { status: "IN_ROUND" } });
    await tx.user.update({ where: { id: partner.id }, data: { status: "IN_ROUND" } });
    return r;
  });

  return NextResponse.json({
    round: { id: round.id, status: round.status, startedAt: round.startedAt.toISOString(), partner: toPublicUser(partner) },
  });
}
