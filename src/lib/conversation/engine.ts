// ============================================================
// RONDA — Motor de Conversación Adaptativo
// engine.ts — el ConversationEngine (spec §1, §2, §8–§12).
//
// El motor es un FACILITADOR INVISIBLE, no el protagonista:
//   - La conversación humana tiene prioridad absoluta.
//   - Si la salud es alta: NO INTERVIENE.
//   - Interviene ante: silencio, estancamiento, respuestas
//     cortas, hooks con historias, coincidencias sin explotar,
//     diferencias divertidas, energía cayendo.
//   - Existe un intervalo mínimo entre intervenciones y límites
//     duros por ronda (spec §11).
//   - El silencio se trata con CONSENTIMIENTO: se ofrece
//     "¿Les tiro una pregunta? 👀" y si dicen "Seguimos
//     hablando", el motor respeta y espera (spec §12).
//
// El motor es puro: recibe tick(elapsedS) desde el host UI y
// emite eventos. No conoce React, ni DOM, ni storage.
// ============================================================

import type {
  EngineConfig,
  EngineEventName,
  EngineEvents,
  EngineParticipant,
  EngineRoundReport,
  HealthSnapshot,
  Intervention,
  InterventionType,
  Speaker,
} from "./types";
import { DEFAULT_ENGINE_CONFIG } from "./types";
import { ConversationContext, topicLabel, type PendingHook } from "./context";
import { computeHealth } from "./health";
import { phaseAt } from "./progression";
import { screenGenerated, screenTurn, SAFE_FALLBACK_INTERVENTION } from "./safety";
import { itemsFor, REACTIVATION, type BankItem } from "./content/bank";
import {
  coincidenceTemplateForTopic,
  differenceTemplate,
  hookTemplate,
  profileCoincidenceTemplate,
  type TemplateArgs,
} from "./content/templates";
import { MetricsCollector } from "./metrics";

type Listener<E extends EngineEventName> = (payload: EngineEvents[E]) => void;

interface Decision {
  kind: "none" | "intervention" | "proposal";
  intervention?: Intervention;
}

const ACCEPT_WINDOW_S = 90; // ventana en la que una respuesta cuenta como "aceptada"

export class ConversationEngine {
  private config: EngineConfig;
  private ctx: ConversationContext;
  private metrics = new MetricsCollector();

  private me: EngineParticipant;
  private partner: EngineParticipant;

  private startedAt = Date.now();
  private lastElapsedS = 0;
  private lastInterventionAtS: number | null = null;
  private dismissedAtS: number | null = null;
  private declinedAtS: number | null = null;
  private lastAcceptedInterventionId: string | null = null;
  private turnCountAtIntervention = 0;
  private silenceEpisodeOpen = false;
  private lastProposalAtS: number | null = null;
  private proposalOpenId: string | null = null;
  private memorableDone = false;
  private hookDeepenings = 0;
  private health: HealthSnapshot = {
    score: 34, trend: "steady", reciprocity: 0, lastExchangeAgoS: null, exchanges: 0, reasons: [],
  };
  private healthSampleSum = 0;
  private healthSampleCount = 0;

  private listeners: { [E in EngineEventName]?: Set<Listener<E>> } = {};

  constructor(args: {
    me: EngineParticipant;
    partner: EngineParticipant;
    config?: Partial<EngineConfig>;
  }) {
    this.me = args.me;
    this.partner = args.partner;
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...args.config };
    this.ctx = new ConversationContext({
      a: args.me.interests,
      b: args.partner.interests,
    });
    this.startedAt = Date.now();
  }

  // ------------------------------------------------------------ eventos
  on<E extends EngineEventName>(event: E, cb: Listener<E>): () => void {
    (this.listeners[event] ??= new Set() as Set<Listener<E>>).add(cb);
    return () => (this.listeners[event] as Set<Listener<E>>).delete(cb);
  }

  private emit<E extends EngineEventName>(event: E, payload: EngineEvents[E]) {
    (this.listeners[event] as Set<Listener<E>> | undefined)?.forEach((cb) => cb(payload));
  }

  // ------------------------------------------------------------ ciclo
  start() {
    this.startedAt = Date.now();
  }

  /** El host llama cada segundo con el tiempo transcurrido de ronda. */
  tick(elapsedS: number) {
    this.lastElapsedS = elapsedS;

    // Muestreo de salud (para métricas).
    this.health = computeHealth({ turns: this.ctx.turns, elapsedS, previous: this.health.score });
    this.healthSampleSum += this.health.score;
    this.healthSampleCount++;
    this.metrics.observeHealth(this.health.score);

    if (elapsedS >= this.config.roundSeconds) return;

    const decision = this.decide(elapsedS);
    if (decision.kind === "intervention" && decision.intervention) {
      this.applyIntervention(decision.intervention);
    } else if (decision.kind === "proposal") {
      this.openProposal(elapsedS);
    }
  }

  private elapsedNow(): number {
    return Math.round((Date.now() - this.startedAt) / 1000);
  }

  // ------------------------------------------------------------ input
  /**
   * Llega un turno de cualquier participante (usuario local o pareja demo).
   * Devuelve ok=false si el Safety Filter lo marcó (no ingresa al mapa).
   * atElapsedS: tiempo sintético de ronda (tests); por defecto, el real.
   */
  addTurn(speaker: Speaker, text: string, atElapsedS?: number): { ok: boolean; flagged?: string } {
    const trimmed = text.trim();
    if (!trimmed) return { ok: false };

    const verdict = screenTurn(trimmed);
    if (!verdict.ok && speaker === "A") {
      // No extraemos temas de turnos problemáticos; avisamos al host.
      this.emit("safety", { category: verdict.category ?? "HARASSMENT", speaker });
      this.metrics.countTurn(speaker, true);
      return { ok: false, flagged: verdict.category ?? "HARASSMENT" };
    }

    const turn = this.ctx.addTurn({
      text: trimmed,
      speaker,
      at: Date.now(),
      elapsedS: atElapsedS ?? this.elapsedNow(),
    });
    this.metrics.countTurn(speaker, false);

    // ¿Este turno responde a la última intervención (la aceptó)?
    if (speaker === "A" && this.lastInterventionAtS !== null) {
      if (turn.elapsedS - this.lastInterventionAtS <= ACCEPT_WINDOW_S) {
        const lastId = this.lastAcceptedInterventionId;
        if (lastId) this.metrics.markAccepted(lastId);
        this.lastAcceptedInterventionId = null;
      }
    }

    // Cerrar silencio abierto: hubo actividad.
    this.silenceEpisodeOpen = false;
    return { ok: true };
  }

  // ------------------------------------------------------------ consentimiento
  /** El usuario aceptó la propuesta de silencio: sí, tiranos una pregunta. */
  acceptProposal(atElapsedS?: number) {
    if (!this.proposalOpenId) return;
    this.proposalOpenId = null;
    this.silenceEpisodeOpen = false;
    this.metrics.countProposal("accepted");
    const i = this.generateIntervention({
      elapsedS: atElapsedS ?? this.elapsedNow(),
      reason: "silencio:aceptado",
      forceType: null,
    });
    if (i) this.applyIntervention(i);
  }

  /** "Seguimos hablando": el motor se calla y respeta (spec §12). */
  declineProposal(atElapsedS?: number) {
    if (!this.proposalOpenId) return;
    this.proposalOpenId = null;
    this.declinedAtS = atElapsedS ?? this.elapsedNow();
    this.metrics.countProposal("declined");
  }

  proposalOpen(): boolean {
    return this.proposalOpenId !== null;
  }

  /** El usuario cerró la propuesta sin responderla (timeout): sin backoff duro. */
  ignoreProposal(atElapsedS?: number) {
    if (!this.proposalOpenId) return;
    this.proposalOpenId = null;
    this.lastProposalAtS = atElapsedS ?? this.elapsedNow();
  }

  // ------------------------------------------------------------ tarjeta
  /** El usuario cerró la tarjeta (X): backoff, no insistir. */
  dismissCurrent(atElapsedS?: number) {
    this.dismissedAtS = atElapsedS ?? this.elapsedNow();
    this.metrics.countIgnored("dismissed");
  }

  /** Botón "Otra": pide una intervención alternativa de la misma fase. */
  requestAnother(atElapsedS?: number): Intervention | null {
    this.metrics.countReplaced();
    const i = this.generateIntervention({
      elapsedS: atElapsedS ?? this.elapsedNow(),
      reason: "otra",
      forceType: null,
    });
    if (i) this.applyIntervention(i);
    return i;
  }

  // ------------------------------------------------------------ decisiones
  private decide(elapsedS: number): Decision {
    // Gate 0: dejar respirar la conexión — nada antes de los 6s.
    if (elapsedS < 6) return { kind: "none" };

    const phase = phaseAt(elapsedS, this.config.roundSeconds);
    const remaining = this.config.roundSeconds - elapsedS;

    // Gate 1: límite duro de intervenciones (spec §11).
    const shown = this.metrics.state.interventionsShown;
    if (shown >= this.config.maxInterventions && !this.memorableDone && remaining > 75) {
      return { kind: "none" };
    }

    // Gate 2: intervalo mínimo entre intervenciones (spec §11).
    const gapOk =
      this.lastInterventionAtS === null ||
      elapsedS - this.lastInterventionAtS >= this.config.minGapS;

    // Gate 3: backoffs de cierre/declinación.
    const dismissedBlock =
      this.dismissedAtS !== null && elapsedS - this.dismissedAtS < this.config.dismissBackoffS;
    const declinedBlock =
      this.declinedAtS !== null && elapsedS - this.declinedAtS < this.config.declineBackoffS;

    // 1) MEMORABLE — el último minuto tiene prioridad absoluta (spec §18).
    //    Supera incluso a una propuesta de silencio sin responder.
    if (!this.memorableDone && remaining <= 75 && remaining > 10) {
      if (this.proposalOpenId) {
        this.proposalOpenId = null;
        this.silenceEpisodeOpen = false;
      }
      this.memorableDone = true;
      const i = this.generateIntervention({
        elapsedS,
        reason: "ultimo-minuto",
        forceType: null,
        phaseOverride: "MEMORABLE",
      });
      return { kind: "intervention", intervention: i ?? undefined };
    }

    if (!gapOk || dismissedBlock || declinedBlock) return { kind: "none" };

    // 2) Silencio → propuesta CON consentimiento (spec §12).
    const lastTurn = this.ctx.turns[this.ctx.turns.length - 1];
    const silenceForS = lastTurn ? elapsedS - lastTurn.elapsedS : elapsedS;
    const enoughSilence = silenceForS >= this.config.silenceTriggerS;
    const proposalCooled =
      this.lastProposalAtS === null || elapsedS - this.lastProposalAtS >= this.config.minGapS;

    if (enoughSilence && !this.silenceEpisodeOpen && !this.proposalOpenId && proposalCooled && this.ctx.turns.length > 0) {
      return { kind: "proposal" };
    }

    // 3) Hook fresco con historia → profundizar (spec §15).
    const hooks = this.ctx.freshHooks(60, elapsedS);
    const hook = hooks[hooks.length - 1];
    if (hook && this.hookDeepenings < 2 && this.ctx.turns.length >= 2) {
      this.hookDeepenings++;
      const i = this.generateIntervention({ elapsedS, reason: "hook", forceType: null, hook });
      if (i) return { kind: "intervention", intervention: i };
    }

    const healthHigh = this.health.score >= this.config.highHealthThreshold;

    // 4) SALUD ALTA → callarse (spec §2 y §10). Salvo memorable/hook ya vistos.
    if (healthHigh) return { kind: "none" };

    // 4) Batalla dentro del MISMO tema (rock vs reggaetón, spec §7):
    // es material más rico que la coincidencia genérica del tema.
    const withinDiff = [...this.ctx.differences].reverse().find((d) => d.withinTopic);
    const withinKey = withinDiff ? `diff:${withinDiff.topicA}-${withinDiff.labelA}-${withinDiff.labelB}` : null;
    const withinFresh =
      withinDiff && withinKey &&
      elapsedS - withinDiff.detectedAtS <= 90 &&
      !this.ctx.usedTopics.has(withinKey);
    if (withinDiff && withinFresh && withinKey) {
      const i = this.generateIntervention({ elapsedS, reason: "diferencia", forceType: null });
      if (i) return { kind: "intervention", intervention: i };
    }

    // 5) Coincidencia viva → explotarla (spec §5). Primero la que surgió
    // hablando; si no hay, la coincidencia de perfiles como plan B (spec §4).
    const coincidence = this.ctx.freshCoincidences()[0];
    const profileCoincidence = coincidence ? null : this.ctx.freshProfileCoincidences()[0] ?? null;
    if (coincidence && this.ctx.hasTurnsFromBoth()) {
      const i = this.generateIntervention({ elapsedS, reason: `coincidencia:${coincidence}`, forceType: null });
      if (i) return { kind: "intervention", intervention: i };
    }
    if (!coincidence && profileCoincidence) {
      const i = this.generateIntervention({ elapsedS, reason: `perfil:${profileCoincidence}`, forceType: null });
      if (i) return { kind: "intervention", intervention: i };
    }

    // 6) Diferencia divertida entre temas → batalla amable (spec §7).
    const difference = this.ctx.differences[this.ctx.differences.length - 1];
    const diffFresh = difference && elapsedS - difference.detectedAtS <= 90;
    if (difference && !difference.withinTopic && diffFresh && !this.ctx.usedTopics.has(`diff:${difference.topicA}-${difference.topicB}`)) {
      const i = this.generateIntervention({ elapsedS, reason: "diferencia", forceType: null });
      if (i) return { kind: "intervention", intervention: i };
    }

    // 7) Salud cayendo o muy baja → reactivar (spec §10).
    // Solo cuando ya hubo conversación real: al arranque la salud
    // naturalmente es baja y la primera intervención sale por fase.
    // Y NUNCA mientras hay una propuesta de silencio abierta: no
    // invitamos dos veces (sería invadir, no facilitar).
    if (this.ctx.turns.length >= 2 && this.health.score < 45 && !this.proposalOpenId) {
      const i = this.generateIntervention({ elapsedS, reason: "reactivacion", forceType: null, reactivate: true });
      if (i) return { kind: "intervention", intervention: i };
    }

    // 8) Nudge de fase: la ronda avanza y no hubo suficientes intercambios.
    const phaseFloor: Record<string, number> = { LIGHT: 2, COINCIDENCE: 4, PERSONAL: 6, MEMORABLE: 6 };
    if (this.ctx.turns.length < phaseFloor[phase] && this.lastInterventionAtS === null) {
      const i = this.generateIntervention({ elapsedS, reason: `fase:${phase}`, forceType: null });
      if (i) return { kind: "intervention", intervention: i };
    }

    return { kind: "none" };
  }

  private openProposal(elapsedS: number) {
    this.silenceEpisodeOpen = true;
    this.lastProposalAtS = elapsedS;
    this.proposalOpenId = `p${Date.now().toString(36)}`;
    this.metrics.countProposal("shown");
    this.emit("proposal", { id: this.proposalOpenId });
  }

  private applyIntervention(i: Intervention) {
    this.lastInterventionAtS = i.elapsedS;
    this.turnCountAtIntervention = this.ctx.turns.length;
    this.lastAcceptedInterventionId = i.id;
    this.ctx.markInterventionUsed(i.text);
    // Una tarjeta de coincidencia cierra el tema explotado; una pregunta
    // de fase NO anula una coincidencia futura sobre ese tema.
    if (i.reason.startsWith("coincidencia:") || i.reason.startsWith("perfil:")) {
      for (const t of i.relatedTopics) this.ctx.markCoincidenceExploited(t);
    } else {
      for (const t of i.relatedTopics) this.ctx.markTopicUsed(t);
    }
    this.metrics.countIntervention(i);
    this.emit("intervention", i);
  }

  // ------------------------------------------------------------ generación
  private generateIntervention(args: {
    elapsedS: number;
    reason: string;
    forceType: InterventionType | null;
    phaseOverride?: string;
    hook?: PendingHook;
    reactivate?: boolean;
  }): Intervention | null {
    const phase = args.phaseOverride ?? phaseAt(args.elapsedS, this.config.roundSeconds);
    const tArgs: TemplateArgs = {
      aName: this.me.name.split(" ")[0],
      bName: this.partner.name.split(" ")[0],
    };
    const seed = Math.random();

    let type: InterventionType;
    let text: string | null = null;
    let relatedTopics: string[] = [];

    // --- Prioridad de generación según el motivo ---
    if (args.reason === "hook" && args.hook) {
      const tpl = hookTemplate(tArgs, seed);
      type = tpl.type;
      text = tpl.make({ ...tArgs, hook: shortHook(args.hook.label) });
      this.ctx.markHookUsed(args.hook.turnId);
    } else if (args.reason.startsWith("coincidencia:")) {
      const topic = args.reason.split(":")[1];
      const detail = this.ctx.strongDetailFor(topic);
      const tpl = coincidenceTemplateForTopic(topic, detail, tArgs, seed);
      type = tpl.type;
      text = tpl.make({ ...tArgs, topic, detail: detail ?? topicLabel(topic) });
      relatedTopics = [topic];
    } else if (args.reason.startsWith("perfil:")) {
      const topic = args.reason.split(":")[1];
      const ptpl = profileCoincidenceTemplate(tArgs, seed);
      type = ptpl.type;
      text = ptpl.make({ ...tArgs, topic, detail: topicLabel(topic) });
      relatedTopics = [topic];
    } else if (args.reason === "diferencia") {
      const diffs = this.ctx.differences;
      const diff = diffs[diffs.length - 1];
      const tpl = differenceTemplate(tArgs, seed, diff.withinTopic);
      type = tpl.type;
      text = tpl.make({
        ...tArgs,
        topic: diff.topicA,
        labelA: diff.labelA,
        labelB: diff.labelB,
      });
      const key = diff.withinTopic
        ? `diff:${diff.topicA}-${diff.labelA}-${diff.labelB}`
        : `diff:${diff.topicA}-${diff.topicB}`;
      this.ctx.usedTopics.add(key);
      relatedTopics = diff.topicA === diff.topicB ? [diff.topicA] : [diff.topicA, diff.topicB];
    } else if (args.reactivate) {
      const item = pickBank(REACTIVATION, seed);
      type = item.type;
      text = item.text;
      relatedTopics = item.topic ? [item.topic] : [];
    } else {
      // Fase normal (o memorable forzada): elegir del banco de fase.
      const bank = itemsFor(phase as BankItem["phase"]);
      const fresh = bank.filter(
        (b) => !this.ctx.wasInterventionUsed(b.text) && !hasOverlap(b, [...this.ctx.usedTopics]),
      );
      const pool = fresh.length > 0 ? fresh : bank;
      // En MEMORABLE preferimos el DEEPENING canónico del spec si no se usó.
      const preferred = pool.find((b) => phase === "MEMORABLE" && b.type === "DEEPENING");
      const item = preferred ?? pickBank(pool, seed);
      type = item.type;
      text = item.text;
      relatedTopics = item.topic ? [item.topic] : [];
    }

    if (!text) return null;

    // Safety Filter final: NADA sale del motor sin pasar (spec §23).
    if (!screenGenerated(text)) text = SAFE_FALLBACK_INTERVENTION;

    return {
      id: `i${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`,
      type,
      phase: phase as Intervention["phase"],
      text,
      reason: args.reason,
      relatedTopics,
      createdAt: Date.now(),
      elapsedS: args.elapsedS,
    };
  }

  // ------------------------------------------------------------ info
  healthSnapshot(): HealthSnapshot {
    return this.health;
  }

  currentPhase() {
    return phaseAt(this.lastElapsedS, this.config.roundSeconds);
  }

  /** Reporte final de la ronda para métricas (spec §20). Sin contenido privado. */
  end(): EngineRoundReport {
    const report = this.metrics.report({
      avgHealth: this.healthSampleCount > 0 ? this.healthSampleSum / this.healthSampleCount : this.health.score,
      peakHealth: this.metrics.state.peakHealth,
      finalHealth: this.health.score,
      topTopics: this.ctx.topTopics(5),
      elapsedS: this.lastElapsedS,
    });
    return report;
  }
}

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------
function pickBank<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seed * arr.length) % arr.length];
}

function hasOverlap(item: BankItem, used: string[]): boolean {
  if (!item.topic) return false;
  return used.includes(item.topic);
}

function shortHook(label: string): string {
  const clean = label.replace(/\s+/g, " ").trim();
  return clean.length > 42 ? `${clean.slice(0, 39)}…` : clean;
}
