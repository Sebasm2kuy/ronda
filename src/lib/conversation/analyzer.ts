// ============================================================
// RONDA — Motor de Conversación Adaptativo
// analyzer.ts — análisis de texto en español rioplatense.
//
// Detecta: temas mencionados, humor, conversation_hooks (frases
// que esconden una historia), preguntas y longitud.
// 100% basado en reglas léxicas (modo DEMO). No interpreta nada
// más: no perfila, no guarda, no juzga. La información queda
// solo en memoria durante la ronda (spec §3 y §24).
// ============================================================

import type { Speaker } from "./types";

export interface RawTurnInput {
  text: string;
  speaker: Speaker;
  at: number;
  elapsedS: number;
}

export interface AnalyzedTurn extends RawTurnInput {
  id: string;
  topics: string[];
  specifics: string[]; // menciones concretas ("japón", "rock", "perros"…)
  humor: boolean;
  hook: string | null;
  isQuestion: boolean;
  length: number;
  flagged: string | null;
}

// Temas con vocabulario rioplatense coloquial (claves internas estables).
const TOPIC_LEXICON: Record<string, string[]> = {
  musica: [
    "música", "musica", "canción", "cancion", "banda", "rock", "reggaetón",
    "reggaeton", "recital", "guitarra", "piano", "canto", "cantar", "spotify",
    "playlist", "concierto", "vinilo", "toca", "toco", "banda sonora", "cumbia",
  ],
  viajes: [
    "viaje", "viajar", "viajé", "viaje solo", "japón", "japon", "europa",
    "mochilero", "destino", "turista", "avión", "avion", "pasaporte", "playa",
    "montaña", "montana", "punta del este", "exterior", "paseo",
  ],
  comida: [
    "comida", "cocinar", "cocino", "cocina", "asado", "parrilla", "pizza",
    "hamburguesa", "pasta", "chef", "restaurant", "restaurante", "comilona",
    "postre", "dulce", "salado", "chivito", "milanesa", "fainá", "hambre",
    "morfi", "merienda", "desayuno", "almuerzo", "cena",
  ],
  bebidas: [
    "mate", "café", "cafe", "vino", "cerveza", "cerveza artesanal", "tragos",
    "whisky", "termo", "billabola", "grappa", "infusión", "té",
  ],
  mascotas: [
    "perro", "perros", "gato", "gatos", "mascota", "mascotas", "cachorro",
    "gatito", "perrito", "adoptar", "refugio",
  ],
  cine: [
    "película", "pelicula", "serie", "cine", "netflix", "documental", "terror",
    "comedia romántica", "drama", "ver pelis", "peli",
  ],
  deportes: [
    "fútbol", "futbol", "gimnasio", "running", "correr", "entrenar", "deporte",
    "deportes", "bici", "bicicleta", "natación", "natacion", "surf", "yoga",
    "maratón", "maraton", "padel", "pádel", "tenis", "basquet", "peñarol",
    "nacional", "selección",
  ],
  familia: [
    "familia", "mamá", "mama", "papá", "papa", "hermano", "hermana", "abuela",
    "abuelo", "hijo", "hija", "sobrino", "primos", "familiares",
  ],
  trabajo: [
    "trabajo", "laburo", "laburar", "oficina", "emprender", "emprendimiento",
    "empleo", "jefe", "cliente", "reunión", "freelance", "proyecto",
  ],
  arte: [
    "arte", "pintar", "dibujo", "fotografía", "fotografia", "foto", "diseño",
    "diseno", "teatro", "museo", "escultura", "manualidades", "escribir",
  ],
  lectura: ["libro", "libros", "leer", "lectura", "novela", "novelas", "cuento"],
  naturaleza: [
    "playa", "montaña", "montana", "campo", "sierra", "bosque", "mar", "rio",
    "río", "naturaleza", "caminata", "trekking", "planta", "plantas", "jardín",
  ],
  juegos: [
    "juego", "juegos", "juegos de mesa", "truco", "cartas", "videojuego",
    "videojuegos", "gamer", "ajedrez", "puzzle", "escapista", "jugar",
  ],
};

// Marcadores de humor (ligeros, no pretendemos detectar ironía).
const HUMOR_PATTERNS = [
  /jaj+/i, /jeje+/i, /jiyi+/i, /jijij+/i, /😂/, /🤣/, /risa/i, /me muero de risa/i,
  /chiste/i, /lol\b/i, /re chistoso/i, /muy gracioso/i, /jejeje/i,
];

// Conversation hooks: frases que esconden una historia (spec §15).
const HOOK_PATTERNS: RegExp[] = [
  /cuando ten[ií]a \d+/i,
  /una vez /i,
  /me fui solo/i,
  /lo peor (es que|fue)/i,
  /no vas a creer/i,
  /termin[ée] (en|llendo|yendo|con)/i,
  /acab[ée] /i,
  /me mor[ií]a de vergüenza/i,
  /nunca (lo cont[ée]|cont[ée] esto)/i,
  /la [uú]ltima vez que /i,
  /me cambi[ée] de vida/i,
  /dej[ée] todo/i,
  /gracias a eso /i,
  /ahí lo conoc[ií]/i,
  /fue (mi|el|la) peor/i,
  /despu[ée]s de eso /i,
];

// Menciones concretas: dentro de un tema, el detalle específico
// que alguien dijo ("Japón" dentro de viajes, "rock" dentro de música).
// Sirve para coincidencias fuertes (los dos eligieron Japón) y para
// batallas dentro del mismo tema (rock vs reggaetón, spec §7).
const SPECIFIC_LEXICON: Record<string, string[]> = {
  "japón": ["japón", "japon", "tokio"],
  "europa": ["europa", "barcelona", "parís", "paris", "italia"],
  "rock": ["rock", "guitarra", "recital", "metal"],
  "reggaetón": ["reggaetón", "reggaeton", "perreo"],
  "cumbia": ["cumbia"],
  "perros": ["perro", "perrito", "cachorro"],
  "gatos": ["gato", "gatito", "michi"],
  "mate": ["mate", "termo"],
  "café": ["café", "cafe", "capuchino", "espresso"],
  "asado": ["asado", "parrilla", "chivito"],
  "pizza": ["pizza", "muzzarella", "fainá"],
  "hamburguesas": ["hamburguesa", "burger"],
  "playa": ["playa", "mar", "verano en la costa"],
  "montaña": ["montaña", "montana", "sierra", "trekking"],
  "fútbol": ["fútbol", "futbol", "pelota", "estadio"],
};

export function detectSpecifics(text: string): string[] {
  const lower = ` ${text.toLowerCase()} `;
  const found: string[] = [];
  for (const [specific, words] of Object.entries(SPECIFIC_LEXICON)) {
    if (words.some((w) => matchesWord(lower, w))) found.push(specific);
  }
  return found;
}

// Preguntas aburridas a evitar como INTERVENCIONES del motor (spec §14).
// (Si el usuario las usa, está bien — no juzgamos a las personas.)
export const BORING_QUESTION_PATTERNS: RegExp[] = [
  /^¿?(qu[ée] haces|de d[óo]nde eres|de d[óo]nd[eé] sos)/i,
  /^¿?(cu[áa]les son tus hobbies)/i,
  /^¿?(qu[ée] buscas|qu[ée] busc[áa]s) en una relaci[óo]n/i,
  /^¿?(a qu[ée] te dedicas)/i,
];

export function detectTopics(text: string): string[] {
  const lower = ` ${text.toLowerCase()} `;
  const found: string[] = [];
  for (const [topic, words] of Object.entries(TOPIC_LEXICON)) {
    // Límites de palabra: "te" no puede matchear "también".
    if (words.some((w) => matchesWord(lower, w))) found.push(topic);
  }
  return found;
}

const WORD_CACHE = new Map<string, RegExp>();
function matchesWord(lower: string, word: string): boolean {
  let re = WORD_CACHE.get(word);
  if (!re) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Plural opcional: "mate" matchea "mates"; el borde usa categorías Unicode.
    re = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}s?(?:[^\\p{L}\\p{N}]|$)`, "u");
    WORD_CACHE.set(word, re);
  }
  return re.test(lower);
}

export function detectHumor(text: string): boolean {
  return HUMOR_PATTERNS.some((p) => p.test(text));
}

export function detectHook(text: string): string | null {
  for (const p of HOOK_PATTERNS) {
    if (p.test(text)) {
      // Devolvemos un fragmento corto como etiqueta del hook (nunca el turno completo).
      const trimmed = text.trim().slice(0, 60);
      return trimmed;
    }
  }
  return null;
}

export function detectQuestion(text: string): boolean {
  return /\?/.test(text) || /^(qu[ée]|c[óo]mo|cu[áa]l|cu[áa]ndo|d[óo]nde|por qu[ée])/i.test(text.trim());
}

let turnCounter = 0;
function nextTurnId(): string {
  turnCounter += 1;
  return `t${Date.now().toString(36)}${turnCounter}`;
}

/** Analiza un turno crudo y produce la versión enriquecida. */
export function analyzeTurn(input: RawTurnInput): AnalyzedTurn {
  const text = input.text.trim();
  return {
    ...input,
    id: nextTurnId(),
    topics: detectTopics(text),
    specifics: detectSpecifics(text),
    humor: detectHumor(text),
    hook: detectHook(text),
    isQuestion: detectQuestion(text),
    length: text.length,
    flagged: null, // lo completa el Safety Filter en el engine
  };
}

/**
 * Detecta en qué tema encaja mejor un texto de pregunta para
 * etiquetar intervenciones (mismo léxico, sirve para el bank).
 */
export function topicsOfInterventionText(text: string): string[] {
  return detectTopics(text);
}
