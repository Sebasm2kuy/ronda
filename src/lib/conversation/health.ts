// ============================================================
// RONDA — Motor de Conversación Adaptativo
// health.ts — "conversation health" 0–100 (spec §10).
//
// El score NO juzga a las personas: mide la interacción
// (frecuencia, reciprocidad, longitud, humor, silencios).
//   score alto  → NO INTERVENIR (la conversación fluye)
//   cayendo     → preparar intervención
//   muy bajo    → dinámica sencilla para reactivar
// ============================================================

import type { AnalyzedTurn } from "./analyzer";
import type { HealthSnapshot } from "./types";

const RECENT_WINDOW_S = 60; // ventana para medir "reciente"

export function computeHealth(args: {
  turns: AnalyzedTurn[];
  elapsedS: number;
  previous: number;
}): HealthSnapshot {
  const { turns, elapsedS, previous } = args;
  const reasons: string[] = [];

  // Frecuencia: turnos por minuto (medido sobre el tiempo transcurrido).
  const minutes = Math.max(elapsedS, 15) / 60;
  const tpm = turns.length / minutes;

  let score = 34; // base: una ronda que apenas arranca tiene chance de fluir

  // Frecuencia de respuestas (hasta +24), con rampa temporal:
  // en el primer minuto la actividad es natural (saludo + primera
  // pregunta), así que su peso crece a medida que pasa la ronda.
  const ramp = Math.min(1, elapsedS / 90);
  let freqBonus = 0;
  if (tpm >= 8) { freqBonus = 24; reasons.push("ritmo alto"); }
  else if (tpm >= 5) { freqBonus = 18; reasons.push("buen ritmo"); }
  else if (tpm >= 2.5) { freqBonus = 10; reasons.push("ritmo moderado"); }
  else { reasons.push("ritmo bajo"); }
  score += Math.round(freqBonus * ramp);

  // Reciprocidad: ¿hablaron ambos en la última ventana?
  const recent = turns.filter((t) => elapsedS - t.elapsedS <= RECENT_WINDOW_S);
  const recentA = recent.some((t) => t.speaker === "A");
  const recentB = recent.some((t) => t.speaker === "B");
  let reciprocity = 0;
  if (recentA) reciprocity += 0.5;
  if (recentB) reciprocity += 0.5;

  if (recentA && recentB) { score += Math.round(20 * ramp); reasons.push("ambos participan"); }
  else if (turns.length > 2 && !recentA && !recentB) {
    score -= 18; reasons.push("nadie habló hace rato");
  } else if (turns.length > 2) {
    score -= 8; reasons.push("uno solo lleva la conversación");
  }

  // ¿Hace cuánto no hay intercambio?
  const lastTurn = turns[turns.length - 1];
  const lastExchangeAgoS = lastTurn ? Math.max(0, elapsedS - lastTurn.elapsedS) : null;
  if (lastExchangeAgoS !== null) {
    if (lastExchangeAgoS <= 15) { score += 8; }
    else if (lastExchangeAgoS <= 40) { score -= 0; }
    else if (lastExchangeAgoS <= 90) { score -= 10; reasons.push("pausa mediana"); }
    else { score -= 22; reasons.push("silencio largo"); }
  }

  // Longitud de los turnos recientes: historias vs monosílabos.
  if (recent.length >= 2) {
    const avgLen = recent.reduce((acc, t) => acc + t.length, 0) / recent.length;
    if (avgLen >= 90) { score += 10; reasons.push("respuestas con historia"); }
    else if (avgLen >= 35) { score += 5; }
    else if (avgLen < 14) { score -= 10; reasons.push("respuestas muy cortas"); }
  }

  // Humor reciente suaviza y suma.
  if (recent.some((t) => t.humor)) { score += 8; reasons.push("hay humor"); }

  // Intercambios acumulados (aprox: pares A↔B alternados).
  let exchanges = 0;
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].speaker !== turns[i - 1].speaker) exchanges++;
  }
  score += Math.min(exchanges, 12);

  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  // Tendencia: comparar con el score previo suavizado.
  const delta = clamped - previous;
  const trend: HealthSnapshot["trend"] = delta >= 4 ? "rising" : delta <= -4 ? "falling" : "steady";

  return {
    score: clamped,
    trend,
    reciprocity,
    lastExchangeAgoS,
    exchanges,
    reasons,
  };
}
