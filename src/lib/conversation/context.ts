// ============================================================
// RONDA — Motor de Conversación Adaptativo
// context.ts — el "Conversation Context" (spec §4).
//
// Mapa interno de la conversación: qué dijo A, qué dijo B,
// coincidencias, diferencias, hooks sin explotar, temas ya
// tratados, preguntas ya usadas y memoria de hechos mencionados.
//
// Vive SOLO en memoria durante la ronda (spec §13 y §24):
// no se persiste contenido de la conversación.
// ============================================================

import { analyzeTurn, type AnalyzedTurn, type RawTurnInput } from "./analyzer";

export interface TopicMention {
  topic: string;
  speaker: "A" | "B";
  elapsedS: number;
}

export interface Difference {
  topicA: string;
  topicB: string;
  labelA: string; // texto corto para plantillas (ej: "rock")
  labelB: string;
  withinTopic: boolean; // true = batalla dentro del mismo tema (rock vs reggaetón)
  detectedAtS: number;
}

export interface PendingHook {
  turnId: string;
  speaker: "A" | "B";
  label: string; // fragmento corto con la historia
  elapsedS: number;
  used: boolean;
}

// Nombres legibles de temas para las plantillas ("Los dos eligieron Japón 👀").
export const TOPIC_LABELS: Record<string, string> = {
  musica: "música",
  viajes: "viajes",
  comida: "comida",
  bebidas: "beber rico",
  mascotas: "animales",
  cine: "pelis y series",
  deportes: "deporte",
  familia: "familia",
  trabajo: "laburo",
  arte: "arte",
  lectura: "lectura",
  naturaleza: "naturaleza",
  juegos: "juegos",
};

export function topicLabel(topic: string): string {
  return TOPIC_LABELS[topic] ?? topic;
}

export class ConversationContext {
  readonly turns: AnalyzedTurn[] = [];
  private topicsBySpeaker: Record<"A" | "B", Set<string>> = { A: new Set(), B: new Set() };
  private mentions: TopicMention[] = [];

  /** Coincidencias confirmadas: temas que AMBOS mencionaron al hablar. */
  readonly coincidences: Map<string, number> = new Map(); // topic → elapsedS de detección
  /** Coincidencias ya explotadas con una tarjeta de coincidencia (no con una pregunta de fase). */
  readonly exploitedCoincidences: Set<string> = new Set();
  /** Detalle concreto compartido por ambos ("japón", "perros") por tema. */
  readonly coincidenceDetails: Map<string, string> = new Map();
  /** Coincidencias de perfil (ambos marcaron el mismo interés). */
  readonly profileCoincidences: Set<string> = new Set();
  readonly differences: Difference[] = [];
  readonly hooks: PendingHook[] = [];
  /** Temas ya explotados por intervenciones — no repetir (spec §13). */
  readonly usedTopics: Set<string> = new Set();
  /** Textos de intervenciones ya mostradas — jamás repetir. */
  readonly usedInterventionTexts: Set<string> = new Set();
  /** Memoria de hechos ("A ama los perros") para no preguntar lo sabido. */
  readonly memories: Array<{ speaker: "A" | "B"; fact: string }> = [];

  constructor(
    profileInterests: { a: string[]; b: string[] },
  ) {
    // Coincidencia de perfil = interés que ambos declararon (spec §4).
    for (const i of profileInterests.a) {
      const norm = i.toLowerCase();
      if (profileInterests.b.some((x) => x.toLowerCase() === norm)) {
        this.profileCoincidences.add(i);
      }
    }
  }

  addTurn(raw: RawTurnInput): AnalyzedTurn {
    const turn = analyzeTurn(raw);
    this.turns.push(turn);

    for (const topic of turn.topics) {
      this.topicsBySpeaker[turn.speaker].add(topic);
      this.mentions.push({ topic, speaker: turn.speaker, elapsedS: turn.elapsedS });
      this.detectCoincidence(topic, turn.elapsedS);
    }

    // Batalla dentro del mismo tema: ambos en "música" pero A rock y B reggaetón.
    this.detectWithinTopicDifference(turn);
    // Diferencia entre temas oponibles (team X vs team Y).
    this.detectDifference(turn);

    if (turn.hook) {
      this.hooks.push({
        turnId: turn.id,
        speaker: turn.speaker,
        label: turn.hook,
        elapsedS: turn.elapsedS,
        used: false,
      });
    }

    // Memoria liviana: primeros ~90 caracteres de cada turno como "hecho conocido".
    // (Solo en memoria; se usa para evitar preguntas redundantes.)
    if (this.memories.length < 40 && turn.length > 8) {
      this.memories.push({ speaker: turn.speaker, fact: turn.text.slice(0, 90) });
    }

    return turn;
  }

  private detectCoincidence(topic: string, elapsedS: number) {
    const both =
      this.topicsBySpeaker.A.has(topic) && this.topicsBySpeaker.B.has(topic);
    if (both && !this.coincidences.has(topic)) {
      this.coincidences.set(topic, elapsedS);
    }
  }

  /** Detalle concreto que AMBOS mencionaron dentro de un tema (si existe). */
  strongDetailFor(topic: string): string | undefined {
    const topicSpecifics = new Set(
      Object.entries(SPECIFIC_TO_TOPIC).filter(([, t]) => t === topic).map(([s]) => s),
    );
    const aSpecifics = new Set(
      this.turns
        .filter((t) => t.speaker === "A")
        .flatMap((t) => t.specifics)
        .filter((s) => topicSpecifics.has(s)),
    );
    const shared = this.turns
      .filter((t) => t.speaker === "B")
      .flatMap((t) => t.specifics)
      .find((s) => topicSpecifics.has(s) && aSpecifics.has(s));
    return shared;
  }

  private detectWithinTopicDifference(turn: AnalyzedTurn) {
    // Funciona para AMBOS hablantes: la batalla existe cuando el
    // segundo en hablar nombra un específico distinto del primero.
    // (El tema padre puede estar "compartido": rock vs reggaetón siguen
    // siendo una batalla, no una coincidencia.)
    const other: "A" | "B" = turn.speaker === "A" ? "B" : "A";
    const otherTurns = this.turns.filter((t) => t.speaker === other && t.id !== turn.id);
    for (const topic of turn.topics) {
      const otherSpecs = otherTurns
        .filter((t) => t.topics.includes(topic))
        .flatMap((t) => t.specifics)
        .filter((s) => SPECIFIC_TO_TOPIC[s] === topic);
      const mySpecs = turn.specifics.filter((s) => SPECIFIC_TO_TOPIC[s] === topic);
      if (mySpecs.length === 0 || otherSpecs.length === 0) continue;
      const mine = mySpecs[0];
      const theirs = otherSpecs.find((s) => s !== mine);
      if (!theirs) continue; // mismo específico: es coincidencia, no batalla
      const specA = turn.speaker === "A" ? mine : theirs;
      const specB = turn.speaker === "A" ? theirs : mine;
      const already = this.differences.some(
        (d) => d.withinTopic && d.labelA === specA && d.labelB === specB,
      );
      if (already) continue;
      this.differences.push({
        topicA: topic,
        topicB: topic,
        labelA: specA,
        labelB: specB,
        withinTopic: true,
        detectedAtS: turn.elapsedS,
      });
      return;
    }
  }

  private detectDifference(turn: AnalyzedTurn) {
    if (turn.speaker !== "A") return; // evaluamos cuando habla A y comparamos con lo previo de B
    const bTopics = this.topicsBySpeaker.B;
    if (bTopics.size === 0 || turn.topics.length === 0) return;
    const aTopic = turn.topics.find((t) => !bTopics.has(t) && !this.coincidences.has(t));
    const bTopic = [...bTopics].find((t) => !turn.topics.includes(t) && !this.coincidences.has(t));
    if (!aTopic || !bTopic) return;
    const clash = OPPOSABLE_PAIRS.find(
      (p) =>
        (p.a === aTopic && p.b === bTopic) || (p.a === bTopic && p.b === aTopic),
    );
    if (!clash) return;
    const already = this.differences.some(
      (d) =>
        (d.topicA === aTopic && d.topicB === bTopic) ||
        (d.topicA === bTopic && d.topicB === aTopic),
    );
    if (already) return;
    this.differences.push({
      topicA: aTopic,
      topicB: bTopic,
      labelA: clash.labelA,
      labelB: clash.labelB,
      withinTopic: false,
      detectedAtS: turn.elapsedS,
    });
  }

  hasTurnsFromBoth(): boolean {
    return this.turns.some((t) => t.speaker === "A") && this.turns.some((t) => t.speaker === "B");
  }

  lastTurnOf(speaker: "A" | "B"): AnalyzedTurn | undefined {
    for (let i = this.turns.length - 1; i >= 0; i--) {
      if (this.turns[i].speaker === speaker) return this.turns[i];
    }
    return undefined;
  }

  /** Coincidencias vivas todavía no explotadas por intervenciones. */
  freshCoincidences(): string[] {
    return [...this.coincidences.keys()].filter((t) => !this.exploitedCoincidences.has(t));
  }

  /** Coincidencias de perfil todavía no explotadas (plan B, spec §4). */
  freshProfileCoincidences(): string[] {
    return [...this.profileCoincidences].filter((t) => !this.exploitedCoincidences.has(t));
  }

  markCoincidenceExploited(topic: string) {
    this.exploitedCoincidences.add(topic);
    this.usedTopics.add(topic); // tampoco re-preguntar el tema por fase
  }

  freshHooks(maxAgeS = 120, nowElapsedS = 0): PendingHook[] {
    return this.hooks.filter(
      (h) => !h.used && nowElapsedS - h.elapsedS <= maxAgeS,
    );
  }

  markHookUsed(turnId: string) {
    const h = this.hooks.find((x) => x.turnId === turnId);
    if (h) h.used = true;
  }

  markTopicUsed(topic: string) {
    this.usedTopics.add(topic);
  }

  markInterventionUsed(text: string) {
    this.usedInterventionTexts.add(normalizeForCompare(text));
  }

  wasInterventionUsed(text: string): boolean {
    return this.usedInterventionTexts.has(normalizeForCompare(text));
  }

  topTopics(limit = 5): string[] {
    const counts = new Map<string, number>();
    for (const m of this.mentions) counts.set(m.topic, (counts.get(m.topic) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([t]) => t);
  }
}

// Pares "oponibles" que generan conversación divertida (spec §7).
const OPPOSABLE_PAIRS = [
  { a: "musica", b: "cine", labelA: "team música", labelB: "team pelis" },
  { a: "mascotas", b: "naturaleza", labelA: "team mascotas", labelB: "team plantas" },
  { a: "deportes", b: "lectura", labelA: "team movimiento", labelB: "team sillón culto" },
  { a: "bebidas", b: "comida", labelA: "team mate", labelB: "team morfi" },
];

// De qué tema trata cada mención específica (puente analyzer → contexto).
const SPECIFIC_TO_TOPIC: Record<string, string> = {
  "japón": "viajes",
  "europa": "viajes",
  "rock": "musica",
  "reggaetón": "musica",
  "cumbia": "musica",
  "perros": "mascotas",
  "gatos": "mascotas",
  "mate": "bebidas",
  "café": "bebidas",
  "asado": "comida",
  "pizza": "comida",
  "hamburguesas": "comida",
  "playa": "naturaleza",
  "montaña": "naturaleza",
  "fútbol": "deportes",
};

function normalizeForCompare(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
