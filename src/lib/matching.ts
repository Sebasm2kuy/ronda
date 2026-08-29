// Motor de matching del MVP.
// La idea: emparejar al usuario con una persona disponible que respete
// mutuamente las preferencias de género y no esté bloqueada por nadie.
// En el futuro, este módulo será reemplazado por matching con IA
// (compatibilidad, intereses, historial de rondas). La interfaz se mantiene.

import { db } from "@/lib/db";
import type { User } from "@prisma/client";

function genderMatches(candidateGender: string, preference: string): boolean {
  if (preference === "EVERYONE") return true;
  if (preference === "WOMEN") return candidateGender === "FEMALE" || candidateGender === "NON_BINARY";
  if (preference === "MEN") return candidateGender === "MALE" || candidateGender === "NON_BINARY";
  return true;
}

/**
 * Busca una pareja disponible para el usuario.
 * Estrategia en capas para que el demo nunca quede sin ronda:
 *  1. Demo users disponibles con preferencias mutuas compatibles
 *  2. Cualquier demo user disponible (se ignoran preferencias)
 *  3. Libera un demo user "ocupado" de forma determinista
 * Devuelve null solo si no existen demo users (entorno corrupto).
 */
export async function findPartner(user: User): Promise<User | null> {
  const blocks = await db.block.findMany({ where: { blockerId: user.id } });
  const blockedBy = await db.block.findMany({ where: { blockedId: user.id } });
  const excluded = new Set<string>([user.id, ...blocks.map((b) => b.blockedId), ...blockedBy.map((b) => b.blockerId)]);

  const candidates = await db.user.findMany({
    where: { isDemo: true, status: "AVAILABLE", id: { notIn: [...excluded] } },
  });

  // Capa 1: preferencias mutuas
  const mutual = candidates.filter(
    (c) => genderMatches(c.gender, user.preference) && genderMatches(user.gender, c.preference)
  );
  if (mutual.length > 0) return pickRandom(mutual);

  // Capa 2: cualquier disponible
  if (candidates.length > 0) return pickRandom(candidates);

  // Capa 3: liberar un demo ocupado (excluye los de la ronda activa sembrada del admin)
  const busy = await db.user.findMany({
    where: { isDemo: true, status: { in: ["WAITING", "ROUND_ENDED"] }, id: { notIn: [...excluded] } },
    take: 5,
  });
  if (busy.length > 0) {
    const chosen = pickRandom(busy);
    await db.user.update({ where: { id: chosen.id }, data: { status: "AVAILABLE" } });
    return chosen;
  }

  const anyDemo = await db.user.findFirst({ where: { isDemo: true, id: { notIn: [...excluded] } } });
  return anyDemo;
}

function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
