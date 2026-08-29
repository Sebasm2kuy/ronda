import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// Terminar la ronda (tiempo agotado o finalizar manualmente).
// Pone a los usuarios en ROUND_ENDED mientras deciden.
export async function POST(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const round = await db.round.findUnique({ where: { id } });
  if (!round || (round.userAId !== user.id && round.userBId !== user.id)) {
    return NextResponse.json({ error: "Ronda no encontrada" }, { status: 404 });
  }

  if (round.status === "ACTIVE") {
    await db.$transaction(async (tx) => {
      await tx.round.update({ where: { id: round.id }, data: { status: "COMPLETED", endedAt: new Date() } });
      await tx.user.update({ where: { id: round.userAId }, data: { status: "ROUND_ENDED" } });
      await tx.user.update({ where: { id: round.userBId }, data: { status: "ROUND_ENDED" } });
    });
  }

  return NextResponse.json({ ok: true });
}
