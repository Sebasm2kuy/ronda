import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

// Bloquear usuario: corta conexiones activas y evita futuras rondas juntos
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const blockedId = String(body?.blockedId ?? "");
  if (!blockedId || blockedId === user.id) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
  }
  const target = await db.user.findUnique({ where: { id: blockedId } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  await db.$transaction(async (tx) => {
    await tx.block.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
      create: { blockerId: user.id, blockedId },
      update: {},
    });
    // Corta las conexiones activas con esa persona
    await tx.connection.updateMany({
      where: {
        status: "ACTIVE",
        OR: [
          { userAId: user.id, userBId: blockedId },
          { userAId: blockedId, userBId: user.id },
        ],
      },
      data: { status: "ENDED" },
    });
  });

  return NextResponse.json({ ok: true });
}
