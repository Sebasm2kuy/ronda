import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { welcomeFor } from "@/lib/demo-messages";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const VALID = ["WANT_MORE", "GOOD_VIBES", "NEXT"] as const;

/**
 * Elección al final de la ronda.
 * - WANT_MORE (quiero volver a hablar): si la otra parte también quiere → MATCH.
 *   En este MVP la persona demo responde WANT_MORE de forma simulada y determinista
 *   (documentado). Con usuarios reales, choiceB llegará desde su propio cliente.
 * - GOOD_VIBES: queda guardado como "conversación pendiente" (función futura).
 * - NEXT: nadie se entera de nada, y vuelve a estar disponible.
 * Nunca se revela la elección de la otra persona salvo que haya match.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const round = await db.round.findUnique({ where: { id } });
  if (!round || (round.userAId !== user.id && round.userBId !== user.id)) {
    return NextResponse.json({ error: "Ronda no encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const choice = String(body?.choice ?? "");
  if (!VALID.includes(choice as (typeof VALID)[number])) {
    return NextResponse.json({ error: "Elección inválida" }, { status: 400 });
  }

  const isA = round.userAId === user.id;
  const partnerId = isA ? round.userBId : round.userAId;
  const partner = await db.user.findUnique({ where: { id: partnerId } });
  if (!partner) return NextResponse.json({ error: "Ronda no encontrada" }, { status: 404 });

  // Ya había decidido (evitar doble elección)
  if ((isA && round.choiceA) || (!isA && round.choiceB)) {
    return NextResponse.json({ error: "Ya registramos tu elección" }, { status: 409 });
  }

  const patch: { choiceA?: string; choiceB?: string } = {};
  if (isA) patch.choiceA = choice;
  else patch.choiceB = choice;

  // Simulación de la respuesta de la persona demo:
  // - WANT_MORE del usuario → la demo también quiere (match garantizado para probar el flujo)
  // - GOOD_VIBES → la demo deja "pendiente"
  // - NEXT → la demo también sigue de largo
  if (partner.isDemo) {
    if (choice === "WANT_MORE") {
      if (isA) patch.choiceB = "WANT_MORE";
      else patch.choiceA = "WANT_MORE";
    } else if (choice === "GOOD_VIBES") {
      if (isA) patch.choiceB = "GOOD_VIBES";
      else patch.choiceA = "GOOD_VIBES";
    }
  }

  await db.round.update({ where: { id: round.id }, data: patch });

  // Si todavía falta la elección de una parte no-demo, esperar (no ocurre en MVP: solo 1 real)
  const updated = await db.round.findUnique({ where: { id: round.id } });
  const bothDecided = updated?.choiceA && updated?.choiceB;

  if (!bothDecided) {
    return NextResponse.json({ matched: false, waiting: true });
  }

  // Estados finales
  const matched = updated!.choiceA === "WANT_MORE" && updated!.choiceB === "WANT_MORE";
  const pending =
    !matched &&
    ((updated!.choiceA === "WANT_MORE" && updated!.choiceB === "GOOD_VIBES") ||
      (updated!.choiceA === "GOOD_VIBES" && updated!.choiceB === "WANT_MORE"));

  if (matched) {
    // ¿Conexión ya existente? Evitar duplicados
    let connection = await db.connection.findFirst({
      where: {
        status: "ACTIVE",
        OR: [
          { userAId: round.userAId, userBId: round.userBId },
          { userAId: round.userBId, userBId: round.userAId },
        ],
      },
    });

    if (!connection) {
      connection = await db.connection.create({
        data: { userAId: round.userAId, userBId: round.userBId, roundId: round.id, status: "ACTIVE" },
      });
      // Saludo inicial de la persona demo (estático, no IA)
      await db.message.create({
        data: {
          connectionId: connection.id,
          senderId: partnerId,
          content: welcomeFor(partner.name),
        },
      });
    }

    await db.user.update({ where: { id: user.id }, data: { status: "CONNECTED" } });
    await db.user.update({ where: { id: partnerId }, data: { status: "CONNECTED" } });

    return NextResponse.json({ matched: true, connectionId: connection.id });
  }

  if (pending) {
    // Segunda oportunidad: guardada como pendiente, función desactivada por ahora
    const exists = await db.connection.findFirst({
      where: { status: "PENDING", roundId: round.id },
    });
    if (!exists) {
      await db.connection.create({
        data: { userAId: round.userAId, userBId: round.userBId, roundId: round.id, status: "PENDING" },
      });
    }
  }

  // Ambos vuelven a estar disponibles para nuevas rondas
  await db.user.update({ where: { id: user.id }, data: { status: "AVAILABLE" } });
  await db.user.update({ where: { id: partnerId }, data: { status: "AVAILABLE" } });

  return NextResponse.json({ matched: false, pending });
}
