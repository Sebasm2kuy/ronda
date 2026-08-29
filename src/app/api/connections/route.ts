import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, toPublicUser } from "@/lib/auth";
import type { ConnectionInfo } from "@/lib/types";

export const runtime = "nodejs";

// Conexiones del usuario: matches activos + pendientes (segunda oportunidad, futuro)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const connections = await db.connection.findMany({
    where: {
      status: { in: ["ACTIVE", "PENDING"] },
      OR: [{ userAId: user.id }, { userBId: user.id }],
    },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  const list: ConnectionInfo[] = [];
  for (const c of connections) {
    const partnerId = c.userAId === user.id ? c.userBId : c.userAId;
    const partner = await db.user.findUnique({ where: { id: partnerId } });
    if (!partner) continue;
    const last = c.messages[0];
    list.push({
      id: c.id,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      partner: toPublicUser(partner),
      lastMessage: last ? { content: last.content, createdAt: last.createdAt.toISOString(), mine: last.senderId === user.id } : null,
    });
  }

  return NextResponse.json({
    connections: list.filter((c) => c.status === "ACTIVE"),
    pending: list.filter((c) => c.status === "PENDING"),
  });
}
