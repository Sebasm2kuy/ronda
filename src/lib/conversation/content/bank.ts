// ============================================================
// RONDA — Motor de Conversación Adaptativo
// content/bank.ts — el material conversacional curado.
//
// REGLAS DE ORO (spec §14):
//   - Preguntas que generan HISTORIAS, no datos.
//   - Nada de entrevista: "¿a qué te dedicas?" está prohibido.
//   - Voseo rioplatense, tono cálido, cero ansiedad.
//
// Organización: por fase de progresión (§9) y por tipo de
// intervención (§8). Las plantillas dinámicas (coincidencias,
// diferencias, hooks) viven en templates.ts y se combinan
// con este banco.
// ============================================================

import type { ConversationPhase, InterventionType } from "../types";

export interface BankItem {
  type: InterventionType;
  phase: ConversationPhase;
  text: string;
  /** Tema dominante de la pregunta (para explotarlo después). */
  topic?: string;
  /** Tono predominante (para respetar el tono de la pareja, spec §16). */
  tone?: "fun" | "neutral" | "deep";
}

// ------------------------------------------------------------------
// FASE LIGHT — primer minuto: romper el hielo sin notarlo.
// ------------------------------------------------------------------
const LIGHT: BankItem[] = [
  { type: "QUESTION", phase: "LIGHT", topic: "musica", text: "¿Qué canción ponés ahora mismo si nadie te puede juzgar?" },
  { type: "QUESTION", phase: "LIGHT", topic: "viajes", text: "Si mañana te regalan un pasaje a cualquier lado, ¿a qué lugar decís sí sin pensarlo?" },
  { type: "QUESTION", phase: "LIGHT", topic: "comida", text: "¿Cuál fue la última comida que te hizo sentir como en casa?" },
  { type: "QUESTION", phase: "LIGHT", topic: "cine", text: "¿Qué peli o serie te dejó pensando más de la cuenta últimamente?" },
  { type: "QUESTION", phase: "LIGHT", topic: "mascotas", text: "¿Tuvo alguna mascota un papel protagónico en tu vida? Contá la historia." },
  { type: "CHOICE", phase: "LIGHT", topic: "bebidas", text: "Decisión urgente: ¿mate dulce o mate amargo? Defiéndanla." },
  { type: "CHOICE", phase: "LIGHT", topic: "viajes", text: "¿Playa o montaña? Cada uno elige y da SU motivo." },
  { type: "CHOICE", phase: "LIGHT", topic: "comida", text: "Batalla clásica: ¿milanesa o chivito? Un solo ganador posible." },
  { type: "HYPOTHETICAL", phase: "LIGHT", topic: "viajes", text: "Les regalan dos pasajes para mañana sin escalas. ¿Dónde terminan?" },
  { type: "HYPOTHETICAL", phase: "LIGHT", topic: "musica", text: "Suena la campana: hoy toca recital gratis de cualquier banda, viva o muerta. ¿A cuál van?" },
  { type: "CHALLENGE", phase: "LIGHT", topic: "musica", text: "Desafío: cada uno tiene 10 segundos para elegir UNA canción que describa su semana. ¡Van!" },
  { type: "QUESTION", phase: "LIGHT", topic: "juegos", text: "¿Qué juego (de mesa, cartas o video) te saca lo competitivo?" },
  { type: "QUESTION", phase: "LIGHT", topic: "naturaleza", text: "¿Cuál es el lugar de Uruguay (o del mundo) donde se te pasa el tiempo volando?" },
  { type: "GAME", phase: "LIGHT", text: "Juego de arranque: cada uno adivina qué toma el otro en el desayuno. ¿Le acertaron?" },
];

// ------------------------------------------------------------------
// FASE COINCIDENCE — minutos 2–3: encontrar lo compartido y
// explotarlo. Muchas de estas se generan dinámicamente desde
// templates.ts cuando aparece una coincidencia real; estas son
// las genéricas de respaldo.
// ------------------------------------------------------------------
const COINCIDENCE: BankItem[] = [
  { type: "QUESTION_BOTH", phase: "COINCIDENCE", topic: "viajes", text: "Los dos tienen viajero adentro 👀 ¿Cuál es ese lugar que todavía no conocen y les muere la ganas?" },
  { type: "QUESTION_BOTH", phase: "COINCIDENCE", topic: "comida", text: "Hay tema común en la mesa: ¿qué plato defiende cada uno como el mejor del país?" },
  { type: "QUESTION_BOTH", phase: "COINCIDENCE", topic: "musica", text: "Coincidencia musical detectada: ¿qué canción define a cada uno esta semana?" },
  { type: "QUESTION", phase: "COINCIDENCE", topic: "familia", text: "¿Qué tradición de tu familia te llevarías a cualquier casa nueva?" },
  { type: "QUESTION", phase: "COINCIDENCE", topic: "deportes", text: "¿Qué deporte o movimiento te hace sentir más vivo/a?" },
  { type: "HYPOTHETICAL", phase: "COINCIDENCE", text: "Hipotético: se cancelan todos los planes del finde. ¿Cómo lo arman entre los dos, idealmente?" },
  { type: "QUESTION_BOTH", phase: "COINCIDENCE", topic: "cine", text: "¿Qué peli elegiría cada uno para mostrarle a un extranjero cómo somos acá?" },
  { type: "GAME", phase: "COINCIDENCE", text: "Juego: cada uno tiene que adivinar la otra cosa que le gusta del café (o del mate). ¿Quién acierta?" },
];

// ------------------------------------------------------------------
// FASE PERSONAL — minutos 3–4: más personal, divertido o
// emocional según el tono que se vino.
// ------------------------------------------------------------------
const PERSONAL: BankItem[] = [
  { type: "QUESTION", phase: "PERSONAL", text: "¿Qué consejo medio tonto que te dieron terminó siendo verdad?" },
  { type: "QUESTION", phase: "PERSONAL", text: "¿Qué cosa te da vergüenza que te gusta igual?" },
  { type: "QUESTION", phase: "PERSONAL", tone: "deep", text: "¿Hubo un año que te cambió la forma de ver las cosas? ¿Cuál y por qué?" },
  { type: "QUESTION", phase: "PERSONAL", text: "¿Qué te hace reír que no debería hacerte reír a tu edad? 😂" },
  { type: "QUESTION_BOTH", phase: "PERSONAL", text: "¿Qué plan elegiría cada uno para cerrar un finde perfecto?" },
  { type: "QUESTION", phase: "PERSONAL", tone: "deep", text: "¿De qué cosa estás más orgulloso/a de este último año?" },
  { type: "QUESTION", phase: "PERSONAL", text: "¿Cuál fue tu mejor compra de menos de mil pesos?" },
  { type: "HYPOTHETICAL", phase: "PERSONAL", text: "Hipotético: mañana se abre un solo restaurant eterno en tu ciudad. ¿Qué cocina sirve?" },
  { type: "CHALLENGE", phase: "PERSONAL", text: "Reto: cada uno cuenta el detalle más raro que tiene en su casa ahora mismo." },
  { type: "QUESTION", phase: "PERSONAL", text: "¿Qué canción te devuelve directo a una época puntual de tu vida?" },
];

// ------------------------------------------------------------------
// FASE MEMORABLE — minuto 4–5: la última interacción que deja
// ganas de seguir (spec §18–19).
// ------------------------------------------------------------------
const MEMORABLE: BankItem[] = [
  { type: "DEEPENING", phase: "MEMORABLE", text: "Antes de que termine la ronda: ¿qué cosa le querés preguntar que todavía no le preguntaste?" },
  { type: "QUESTION_BOTH", phase: "MEMORABLE", text: "¿De qué seguirían hablando si esta ronda durara 5 minutos más?" },
  { type: "QUESTION", phase: "MEMORABLE", text: "Última de la ronda: contá algo que por lo general no contás al conocer a alguien." },
  { type: "QUESTION", phase: "MEMORABLE", tone: "deep", text: "¿Qué le dirías a tu yo de hace 5 años, en una sola frase?" },
  { type: "QUESTION_BOTH", phase: "MEMORABLE", text: "Si se cruzaran por casualidad en un recital, ¿en qué escenario estarían? Elijan juntos." },
];

// ------------------------------------------------------------------
// REACTIVACIÓN — cuando la salud cae (spec §10): dinámicas
// sencillas, cero presión, para que vuelva la conversación.
// ------------------------------------------------------------------
export const REACTIVATION: BankItem[] = [
  { type: "CHOICE", phase: "LIGHT", text: "Dinámica exprés para reactivar: ¿verano o invierno? Cada uno defiende su equipo 20 segundos." },
  { type: "GAME", phase: "LIGHT", text: "Reactivación: cada uno dice algo que asume del otro. ¿Le acertaron o pifiaron feo?" },
  { type: "CHALLENGE", phase: "LIGHT", text: "Reto exprés: cada uno nombra 3 cosas que tenga a mano ahora mismo. 😂" },
  { type: "CHOICE", phase: "LIGHT", topic: "comida", text: "Quick: ¿pizza con piña: sí o no? Sin vueltas." },
  { type: "QUESTION", phase: "LIGHT", text: "Suave para retomar: ¿qué es lo último que te sacó una sonrisa?" },
];

const BANK: BankItem[] = [...LIGHT, ...COINCIDENCE, ...PERSONAL, ...MEMORABLE];

export function itemsFor(phase: ConversationPhase): BankItem[] {
  return BANK.filter((i) => i.phase === phase);
}

export function allItems(): BankItem[] {
  return BANK;
}

/** Frases prohibidas como intervención (el motor nunca entrevista). */
export const FORBIDDEN_INTERVENTION_PATTERNS: RegExp[] = [
  /^¿?(qu[ée] haces|a qu[ée] te dedicas|de d[óo]nde sos|de d[óo]nde eres)/i,
  /^¿?(cu[áa]les son tus hobbies)/i,
  /^¿?(qu[ée] busc[áa]s|qu[ée] buscas) en una relaci[óo]n/i,
  /^¿?(tu edad|cu[áa]ntos a[ñn]os ten[ée]s)/i,
  /^¿?(te gusta viajar|te gusta la m[úu]sica)\??$/i,
];
