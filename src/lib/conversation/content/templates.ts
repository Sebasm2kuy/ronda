// ============================================================
// RONDA — Motor de Conversación Adaptativo
// content/templates.ts — generación DINÁMICA de intervenciones
// a partir de lo que las dos personas ACABAN de decir
// (spec §5, §6, §7).
//
// Cada plantilla recibe el contexto mínimo (nombres, temas,
// coincidencias, diferencias, hooks) y produce texto natural
// en voseo rioplatense. Nada de cuestionarios: cada pregunta
// nace de algo que alguien dijo.
// ============================================================

import { topicLabel } from "../context";
import type { InterventionType } from "../types";

export interface TemplateArgs {
  aName: string;
  bName: string;
  topic?: string; // etiqueta de tema detectada
  detail?: string; // detalle textual (ej: "Japón", "los domingos con la familia")
  hook?: string; // fragmento del conversation hook
}

// ------------------------------------------------------------------
// COINCIDENCIAS (spec §5): el caso estrella.
// ------------------------------------------------------------------
const COINCIDENCE_TEMPLATES: Array<{ type: InterventionType; make: (a: TemplateArgs) => string }> = [
  {
    // La plantilla exacta del spec para coincidencias fuertes.
    type: "HYPOTHETICAL",
    make: (a) =>
      `Los dos eligieron ${cap(a.detail) ?? topicLabel(a.topic ?? "")} 👀 Si mañana les regalaran los pasajes, ¿qué sería lo primero que harían al llegar?`,
  },
  {
    type: "QUESTION_BOTH",
    make: (a) =>
      `Coincidieron en ${a.detail ?? topicLabel(a.topic ?? "")} sin ponerse de acuerdo… ¿desde cuándo les gusta? ¿Quién lo descubrió primero?`,
  },
  {
    type: "QUESTION_BOTH",
    make: (a) =>
      `${a.aName} y ${a.bName} coincidieron en ${topicLabel(a.topic ?? "")} 🤝 Escaló rápido: ¿cuál es EL momento más fuerte que les dejó?`,
  },
  {
    type: "CHALLENGE",
    make: (a) =>
      `Ya que los dos son de ${topicLabel(a.topic ?? "")}: mini desafío, cada uno nombra SU favorito absoluto. ¿Coincide o hay traidor? 😂`,
  },
  {
    type: "DEEPENING",
    make: (a) =>
      `Ese ${a.detail ?? topicLabel(a.topic ?? "")} compartido merece profundidad: ¿qué historia esconden cada uno?`,
  },
];

// ------------------------------------------------------------------
// DIFERENCIAS (spec §7): oportunidades, no problemas.
// ------------------------------------------------------------------
const DIFFERENCE_TEMPLATES: Array<{ type: InterventionType; make: (a: TemplateArgs) => string }> = [
  {
    // La plantilla exacta de la batalla musical del spec.
    type: "CHALLENGE",
    make: (a) =>
      `Tenemos una batalla de ${topicLabel(a.topic ?? "")} 😂 Cada uno tiene que elegir UNA canción (o UN argumento) para intentar convertir al otro.`,
  },
  {
    type: "QUESTION_BOTH",
    make: (a) =>
      `${a.labelA ?? "un lado"} contra ${a.labelB ?? "el otro"}: que gane el mejor argumento. ¿Quién defiende qué?`,
  },
  {
    type: "GAME",
    make: (a) =>
      `Juego de posturas: cada uno defiende SU lado de la ${topicLabel(a.topic ?? "")} por 30 segundos… y después intercambian roles 😂`,
  },
];

// Batalla dentro del MISMO tema (rock vs reggaetón): el texto nombra
// los específicos que cada uno dijo — es lo que la hace divertida.
const WITHIN_BATTLE_TEMPLATES: Array<{ type: InterventionType; make: (a: TemplateArgs) => string }> = [
  {
    type: "CHALLENGE",
    make: (a) =>
      `Tenemos una batalla de ${topicLabel(a.topic ?? "")} 😂 ${a.labelA} contra ${a.labelB}: cada uno tiene UNA canción (o UN argumento) para intentar convertir al otro.`,
  },
  {
    type: "QUESTION_BOTH",
    make: (a) =>
      `${cap(a.labelA)} o ${a.labelB}? La batalla está servida 😂 Que defienda cada uno el suyo.`,
  },
];

function cap(s: string | undefined): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

// ------------------------------------------------------------------
// HOOKS (spec §15): frases que esconden una historia.
// ------------------------------------------------------------------
const HOOK_TEMPLATES: Array<{ type: InterventionType; make: (a: TemplateArgs) => string }> = [
  {
    // La plantilla exacta del spec.
    type: "DEEPENING",
    make: (a) => `Pará, eso merece explicación 😂 ¿Qué pasó en "${a.hook ?? "esa historia"}"?`,
  },
  {
    type: "DEEPENING",
    make: () => `¿Y cómo terminaste metido/a en eso?`,
  },
  {
    type: "QUESTION",
    make: (a) => `Eso de "${a.hook ?? "eso"}" suena a capítulo de serie. Contá de arranque: ¿cómo empieza?`,
  },
];

// ------------------------------------------------------------------
// RESPUESTAS A DETALLE (spec §6): cuando alguien aportó un
// detalle concreto ("hago unas hamburguesas bastante buenas").
// ------------------------------------------------------------------
const DETAIL_TEMPLATES: Array<{ type: InterventionType; make: (a: TemplateArgs) => string }> = [
  {
    type: "QUESTION_BOTH",
    make: (a) =>
      `Hay una pequeña competencia acá 😂 ¿Qué tendría que tener eso de ${a.detail ?? topicLabel(a.topic ?? "")} para que realmente impresione a ${a.bName}?`,
  },
  {
    type: "QUESTION",
    make: (a) => `Eso de ${a.detail ?? topicLabel(a.topic ?? "")} hay que aprovecharlo: ¿cómo empezó todo?`,
  },
];

// ------------------------------------------------------------------
// CULMINACIÓN DE COINCIDENCIA DE PERFIL (plan B, spec §4):
// ambos marcaron el mismo interés y la charla no lo tocó aún.
// ------------------------------------------------------------------
const PROFILE_COINCIDENCE_TEMPLATES: Array<{ type: InterventionType; make: (a: TemplateArgs) => string }> = [
  {
    type: "QUESTION_BOTH",
    make: (a) =>
      `Vi que los dos marcaron ${a.detail ?? topicLabel(a.topic ?? "")} en sus perfiles 👀 ¿Quién se lleva mejor ese mundo?`,
  },
  {
    type: "HYPOTHETICAL",
    make: (a) =>
      `Con ${a.detail ?? topicLabel(a.topic ?? "")} en común: si pudieran pasar un día entero haciendo solo eso, ¿cómo sería perfecto?`,
  },
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seed * 1000) % arr.length];
}

export function coincidenceTemplate(args: TemplateArgs, seed: number) {
  return pick(COINCIDENCE_TEMPLATES, seed);
}

/**
 * Elige la plantilla de coincidencia según el tema: la del spec
 * ("Los dos eligieron Japón 👀 ... pasajes") es propia de VIAJES;
 * para música va el desafío de favoritos, para comida la
 * competencia, etc. Con detalle fuerte (ambos dijeron lo mismo)
 * el texto nombra ese detalle.
 */
export function coincidenceTemplateForTopic(
  topic: string,
  detail: string | undefined,
  args: TemplateArgs,
  seed: number,
) {
  const tplIndex: Record<string, number> = {
    viajes: 0, // "Los dos eligieron X 👀 ... los pasajes" (spec §5)
    musica: 3, // desafío de favoritos absolutos
    comida: 1, // coincidieron sin ponerse de acuerdo
    mascotas: 2, // escaló rápido
  };
  const idx = tplIndex[topic] ?? Math.floor(seed * COINCIDENCE_TEMPLATES.length) % COINCIDENCE_TEMPLATES.length;
  return COINCIDENCE_TEMPLATES[idx] ?? pick(COINCIDENCE_TEMPLATES, seed);
}

export function differenceTemplate(args: TemplateArgs, seed: number, withinTopic = false) {
  return withinTopic ? pick(WITHIN_BATTLE_TEMPLATES, seed) : pick(DIFFERENCE_TEMPLATES, seed);
}

export function hookTemplate(args: TemplateArgs, seed: number) {
  return pick(HOOK_TEMPLATES, seed);
}

export function detailTemplate(args: TemplateArgs, seed: number) {
  return pick(DETAIL_TEMPLATES, seed);
}

export function profileCoincidenceTemplate(args: TemplateArgs, seed: number) {
  return pick(PROFILE_COINCIDENCE_TEMPLATES, seed);
}

// Temas oponibles con etiquetas para batallas (mantiene coherencia con context.ts).
export const OPPOSABLE_LABELS: Record<string, string> = {
  musica: "música",
  cine: "pelis",
  mascotas: "mascotas",
  naturaleza: "plantas",
  deportes: "deporte",
  lectura: "leer",
  bebidas: "mate/café",
  comida: "comida",
};
