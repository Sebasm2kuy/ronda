// ============================================================
// RONDA — Motor de Conversación Adaptativo
// types.ts — contratos core compartidos por todo el motor.
//
// Principio absoluto (spec §26):
//   La IA no está para HACER la conversación. Está para hacer
//   POSIBLE que la conversación entre dos personas sea mejor.
//
// El motor es TypeScript puro (sin React, sin DOM) para poder
// testearlo y para poder correr tanto en el MVP estático como
// en un backend real.
// ============================================================

/** Tipos de intervención del motor (spec §8). */
export type InterventionType =
  | "QUESTION" // A — pregunta abierta ligada al contexto
  | "QUESTION_BOTH" // B — pregunta para ambos, obliga a comparar
  | "CHALLENGE" // C — desafío ("cada uno, 10 segundos, una canción")
  | "CHOICE" // D — elección ("¿playa o montaña?")
  | "HYPOTHETICAL" // E — situación hipotética
  | "GAME" // F — juego ("adivinen algo del otro")
  | "DEEPENING"; // G — profundización de un tema/hook aparecido

/** Fases de la progresión de los 5 minutos (spec §9). */
export type ConversationPhase = "LIGHT" | "COINCIDENCE" | "PERSONAL" | "MEMORABLE";

/** Quién habla. A = usuario local, B = la otra persona. */
export type Speaker = "A" | "B";

/** Un turno de conversación (ya analizado por el analyzer). */
export interface Turn {
  id: string;
  speaker: Speaker;
  text: string;
  at: number; // epoch ms
  elapsedS: number; // segundo de ronda en que ocurrió
  topics: string[]; // temas detectados (claves del analyzer)
  humor: boolean; // usa humor
  hook: string | null; // conversation_hook detectado (frase con historia)
  isQuestion: boolean;
  length: number; // longitud del texto
  flagged: string | null; // categoría de safety si rompe reglas, si no null
}

/** Una intervención del motor (tarjeta que se muestra a ambos). */
export interface Intervention {
  id: string;
  type: InterventionType;
  phase: ConversationPhase;
  text: string; // texto final a mostrar (pasa por Safety Filter)
  reason: string; // trazabilidad interna: "coincidencia:viajes", "silencio", "hook", "fase"
  relatedTopics: string[];
  createdAt: number;
  elapsedS: number;
}

/** Snapshot de "conversation health" (spec §10). */
export interface HealthSnapshot {
  score: number; // 0–100
  trend: "rising" | "steady" | "falling";
  reciprocity: number; // 0–1, participación de ambos
  lastExchangeAgoS: number | null; // hace cuánto que no hay turnos
  exchanges: number; // intercambios totales (pares A↔B aproximados)
  reasons: string[]; // por qué ese score (útil para métricas/IA futura)
}

/** Configuración del motor (límites de la spec §11). */
export interface EngineConfig {
  /** Mínimo de segundos entre intervenciones — la IA debe callarse. */
  minGapS: number;
  /** Backoff tras cerrar una tarjeta manualmente (X). */
  dismissBackoffS: number;
  /** Backoff tras responder "Seguimos hablando" a la propuesta. */
  declineBackoffS: number;
  /** Segundos sin actividad antes de ofrecer "¿Les tiro una pregunta? 👀". */
  silenceTriggerS: number;
  /** Máximo de intervenciones por ronda. */
  maxInterventions: number;
  /** Salud por encima de la cual el motor NO interviene (salvo memorable/hook). */
  highHealthThreshold: number;
  /** Segundos de ronda (300 = 5 minutos). */
  roundSeconds: number;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  minGapS: 45,
  dismissBackoffS: 60,
  declineBackoffS: 90,
  silenceTriggerS: 25,
  maxInterventions: 6,
  highHealthThreshold: 78,
  roundSeconds: 300,
};

/** Participante visto por el motor: lo mínimo necesario, sin datos sensibles. */
export interface EngineParticipant {
  name: string;
  interests: string[]; // intereses declarados en el perfil
}

/** Datos que recibe un AIProvider (spec §21) — compacto y consciente de privacidad. */
export interface ConversationPayload {
  phase: ConversationPhase;
  elapsedS: number;
  health: HealthSnapshot;
  participants: { a: string; b: string };
  topics: { a: string[]; b: string[] };
  coincidences: string[];
  differences: Array<{ a: string; b: string }>;
  hooks: string[];
  usedInterventionTexts: string[];
  recentTurns: Array<{ speaker: Speaker; text: string }>; // últimos N, recortados
  askedFor: InterventionType; // tipo de intervención solicitado
}

/** Reporte de fin de ronda para métricas (spec §20). Sin contenido privado. */
export interface EngineRoundReport {
  interventionsShown: number;
  interventionsByType: Partial<Record<InterventionType, number>>;
  interventionsAccepted: number; // hubo respuesta de A dentro de la ventana
  interventionsIgnored: number; // cerradas / reemplazadas / expiradas sin respuesta
  interventionsReplaced: number; // botón "Otra"
  proposalsShown: number; // "¿Les tiro una pregunta?"
  proposalsAccepted: number;
  proposalsDeclined: number;
  avgGapS: number | null;
  exchanges: number;
  turnsA: number;
  turnsB: number;
  avgHealth: number;
  peakHealth: number;
  finalHealth: number;
  topTopics: string[];
  elapsedS: number;
}

export type EngineEventName = "intervention" | "proposal" | "safety";

export interface EngineEvents {
  intervention: Intervention;
  proposal: { id: string };
  safety: { category: string; speaker: Speaker };
}

/** Interfaz del proveedor de IA (spec §21) — desacoplada del motor. */
export interface AIProvider {
  readonly name: string;
  /** Devuelve el texto de una intervención, o null si no puede/queda callado. */
  generate(payload: ConversationPayload): Promise<Intervention | null>;
}
