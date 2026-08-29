// ============================================================
// RONDA — Motor de Conversación Adaptativo
// progression.ts — progresión de los 5 minutos (spec §9).
//
//   MINUTO 1      LIGHT       temas ligeros: romper el hielo
//   MINUTOS 2–3   COINCIDENCE encontrar y explotar coincidencias
//   MINUTOS 3–4   PERSONAL    interacción más personal/divertida
//   MINUTO 4–5    MEMORABLE   última interacción memorable
// ============================================================

import type { ConversationPhase } from "./types";

export function phaseAt(elapsedS: number, roundSeconds = 300): ConversationPhase {
  const t = elapsedS;
  const total = roundSeconds;
  if (t < 60) return "LIGHT";
  if (t < Math.min(180, total * 0.6)) return "COINCIDENCE";
  if (t < Math.min(240, total * 0.8)) return "PERSONAL";
  return "MEMORABLE";
}

/** Segundos restantes para saber si estamos en el "último minuto" (spec §18). */
export function secondsLeft(elapsedS: number, roundSeconds = 300): number {
  return Math.max(0, roundSeconds - elapsedS);
}
