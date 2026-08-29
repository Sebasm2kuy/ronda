// ============================================================
// RONDA — Motor de Conversación Adaptativo
// metrics.ts — métricas internas del motor (spec §20).
//
// Métricas para MEJORAR EL PRODUCTO, nunca para manipular:
//   - % de preguntas aceptadas / ignoradas
//   - tiempo promedio entre intervenciones
//   - intervenciones por ronda
//   - salud promedio/pico/final
//   - temas que generan más interacción
//
// PRIVACIDAD: no se guarda el contenido de las respuestas ni
// el texto de los turnos. Solo contadores, duraciones y
// etiquetas de tema.
// ============================================================

import type { EngineRoundReport, Intervention, InterventionType, Speaker } from "./types";

export interface MetricsState {
  interventionsShown: number;
  interventionsByType: Partial<Record<InterventionType, number>>;
  acceptedIds: Set<string>;
  ignoredCount: number;
  ignoredReasons: Record<string, number>;
  replacedCount: number;
  proposalsShown: number;
  proposalsAccepted: number;
  proposalsDeclined: number;
  interventionTimesS: number[];
  turnsA: number;
  turnsB: number;
  flaggedTurns: number;
  peakHealth: number;
  startedAtMs: number;
}

export class MetricsCollector {
  readonly state: MetricsState = {
    interventionsShown: 0,
    interventionsByType: {},
    acceptedIds: new Set(),
    ignoredCount: 0,
    ignoredReasons: {},
    replacedCount: 0,
    proposalsShown: 0,
    proposalsAccepted: 0,
    proposalsDeclined: 0,
    interventionTimesS: [],
    turnsA: 0,
    turnsB: 0,
    flaggedTurns: 0,
    peakHealth: 0,
    startedAtMs: Date.now(),
  };

  countIntervention(i: Intervention) {
    this.state.interventionsShown++;
    this.state.interventionsByType[i.type] = (this.state.interventionsByType[i.type] ?? 0) + 1;
    this.state.interventionTimesS.push(i.elapsedS);
  }

  markAccepted(interventionId: string) {
    this.state.acceptedIds.add(interventionId);
  }

  countIgnored(reason: string) {
    this.state.ignoredCount++;
    this.state.ignoredReasons[reason] = (this.state.ignoredReasons[reason] ?? 0) + 1;
  }

  countReplaced() {
    this.state.replacedCount++;
  }

  countProposal(kind: "shown" | "accepted" | "declined") {
    if (kind === "shown") this.state.proposalsShown++;
    else if (kind === "accepted") this.state.proposalsAccepted++;
    else this.state.proposalsDeclined++;
  }

  countTurn(speaker: Speaker, flagged: boolean) {
    if (speaker === "A") this.state.turnsA++;
    else this.state.turnsB++;
    if (flagged) this.state.flaggedTurns++;
  }

  observeHealth(score: number) {
    this.state.peakHealth = Math.max(this.state.peakHealth, score);
  }

  report(final: {
    avgHealth: number;
    peakHealth: number;
    finalHealth: number;
    topTopics: string[];
    elapsedS: number;
  }): EngineRoundReport {
    const s = this.state;
    const gaps: number[] = [];
    for (let i = 1; i < s.interventionTimesS.length; i++) {
      gaps.push(s.interventionTimesS[i] - s.interventionTimesS[i - 1]);
    }
    const avgGapS = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;

    return {
      interventionsShown: s.interventionsShown,
      interventionsByType: { ...s.interventionsByType },
      interventionsAccepted: s.acceptedIds.size,
      interventionsIgnored: s.ignoredCount,
      interventionsReplaced: s.replacedCount,
      proposalsShown: s.proposalsShown,
      proposalsAccepted: s.proposalsAccepted,
      proposalsDeclined: s.proposalsDeclined,
      avgGapS,
      exchanges: Math.max(0, s.turnsA + s.turnsB - 1),
      turnsA: s.turnsA,
      turnsB: s.turnsB,
      avgHealth: Math.round(final.avgHealth),
      peakHealth: Math.max(final.peakHealth, final.finalHealth),
      finalHealth: final.finalHealth,
      topTopics: final.topTopics,
      elapsedS: final.elapsedS,
    };
  }
}
