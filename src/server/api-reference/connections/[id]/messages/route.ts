import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function loadConnection(connectionId: string, userId: string) {
  const c = await db.connection.findUnique({ where: { id: connectionId } });
  if (!c) return null;
  if (c.userAId !== userId && c.userBId !== userId) return null;
  return c;
}

// Obtener mensajes (polling; soporta ?after=<iso> para traer solo nuevos)
export async function GET(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const connection = await loadConnection(id, user.id);
  if (!connection) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

  const after = req.nextUrl.searchParams.get("after");
  const messages = await db.message.findMany({
    where: {
      connectionId: connection.id,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  const list: ChatMessage[] = messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    mine: m.senderId === user.id,
  }));

  return NextResponse.json({ messages: list });
}

// Enviar mensaje
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const connection = await loadConnection(id, user.id);
  if (!connection) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  if (connection.status !== "ACTIVE") {
    return NextResponse.json({ error: "Esta conversación no está activa" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const content = String(body?.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ error: "Mensaje demasiado largo" }, { status: 400 });

  const message = await db.message.create({
    data: { connectionId: connection.id, senderId: user.id, content },
  });

  const out: ChatMessage = {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    mine: true,
  };
  return NextResponse.json({ message: out });
}
