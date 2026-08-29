// ============================================================
// RONDA — Motor de Conversación Adaptativo
// metrics-client.ts — persistencia de métricas del motor.
//
// En el MVP estático las métricas viven en IndexedDB (privadas
// por dispositivo, spec §20: "para mejorar el producto"). En un
// futuro con backend real, este módulo pasa a ser un POST.
// No se guarda contenido de conversaciones: solo contadores.
// ============================================================

import { kvGet, kvSet } from "@/lib/idb";
import type { EngineRoundReport } from "./types";

const keyFor = (roundId: string) => `metrics:conv:${roundId}`;
const AGG_KEY = "metrics:conv:aggregate";

export interface ConversationAggregate {
  rounds: number;
  totalInterventions: number;
  totalAccepted: number;
  totalIgnored: number;
  totalReplaced: number;
  proposalsShown: number;
  proposalsAccepted: number;
  proposalsDeclined: number;
  sumFinalHealth: number;
  sumInterventions: number;
  byType: Record<string, number>;
  topTopics: Record<string, number>;
  updatedAt: string;
}

export async function persistRoundMetrics(roundId: string, report: EngineRoundReport): Promise<void> {
  try {
    await kvSet(keyFor(roundId), report);
    const prev = (await kvGet<ConversationAggregate>(AGG_KEY)) ?? emptyAggregate();
    const next: ConversationAggregate = {
      rounds: prev.rounds + 1,
      totalInterventions: prev.totalInterventions + report.interventionsShown,
      totalAccepted: prev.totalAccepted + report.interventionsAccepted,
      totalIgnored: prev.totalIgnored + report.interventionsIgnored,
      totalReplaced: prev.totalReplaced + report.interventionsReplaced,
      proposalsShown: prev.proposalsShown + report.proposalsShown,
      proposalsAccepted: prev.proposalsAccepted + report.proposalsAccepted,
      proposalsDeclined: prev.proposalsDeclined + report.proposalsDeclined,
      sumFinalHealth: prev.sumFinalHealth + report.finalHealth,
      sumInterventions: prev.sumInterventions + report.interventionsShown,
      byType: mergeCounts(prev.byType, report.interventionsByType as Record<string, number>),
      topTopics: mergeCounts(prev.topTopics, Object.fromEntries(report.topTopics.map((t) => [t, 1]))),
      updatedAt: new Date().toISOString(),
    };
    await kvSet(AGG_KEY, next);
  } catch {
    // Métricas best-effort: nunca romper la experiencia por telemetría.
  }
}

export async function readConversationAggregate(): Promise<ConversationAggregate | null> {
  try {
    return (await kvGet<ConversationAggregate>(AGG_KEY)) ?? null;
  } catch {
    return null;
  }
}

function emptyAggregate(): ConversationAggregate {
  return {
    rounds: 0,
    totalInterventions: 0,
    totalAccepted: 0,
    totalIgnored: 0,
    totalReplaced: 0,
    proposalsShown: 0,
    proposalsAccepted: 0,
    proposalsDeclined: 0,
    sumFinalHealth: 0,
    sumInterventions: 0,
    byType: {},
    topTopics: {},
    updatedAt: new Date().toISOString(),
  };
}

function mergeCounts(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v;
  return out;
}

/** Resumen por ronda para la página de fin (sin contenido privado). */
export function saveRoundSummary(roundId: string, s: { finalHealth: number; peakHealth: number; exchanges: number; goodChat: boolean }): void {
  try {
    sessionStorage.setItem(`ronda:conv:${roundId}`, JSON.stringify(s));
  } catch {
    // sessionStorage puede no estar disponible; la página de fin funciona igual.
  }
}
