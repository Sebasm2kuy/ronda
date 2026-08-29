// ============================================================
// RONDA — Motor de Conversación Adaptativo
// demo/persona.ts — simulador de la pareja en MODO DEMO (§22).
//
// La pareja demo "habla" mediante reglas predefinidas para que
// toda la experiencia del motor pueda probarse SIN una API de
// IA real. La simulación:
//   - responde las intervenciones del motor con su personalidad
//     (intereses del perfil demo),
//   - reacciona a lo que el usuario real escribe,
//   - ESPEJA temas cuando su perfil coincide → crea
//     coincidencias reales que el motor puede detectar (§5),
//   - sostiene diferencias divertidas cuando no coincide (§7),
//   - suelta un "conversation hook" de vez en cuando (§15),
//   - invita a participar cuando el usuario calla ("¿Y vos?").
//
// Todo vive en memoria. Nada se persiste (§24).
// ============================================================

import type { Intervention } from "../types";

export interface DemoPersona {
  name: string;
  interests: string[];
  bio: string | null;
}

type Utter = (text: string) => void;

interface MirrorRule {
  match: RegExp;
  /** Solo aplica si la persona tiene alguno de estos intereses. */
  requires?: string[];
  answers: string[];
}

// ------------------------------------------------------------------
// Reglas de espejo: cuando el usuario menciona algo concreto y el
// perfil de la persona coincide, responde "compartiendo" el tema
// → el motor detecta la coincidencia (espejo de la vida real).
// ------------------------------------------------------------------
const MIRROR_RULES: MirrorRule[] = [
  {
    // Sin requisito de perfil: a Japón lo sueña todo el mundo (beat
    // canónico del spec: "Yo también quiero conocer Japón").
    match: /jap[óo]n/i,
    answers: ["Yo también quiero conocer Japón.", "Japón también está primero en mi lista 👀"],
  },
  {
    match: /\brock\b|guitarra/i,
    requires: ["Rock", "Música", "Conciertos"],
    answers: ["El rock también me vive 🤘 ¿banda favorita?", "Re fan del rock acá también."],
  },
  {
    match: /cocin\w|cocina/i,
    requires: ["Cocina", "Gastronomía"],
    answers: ["Me encanta cocinar los domingos con mi familia.", "Cocinar los domingos también es mi plan sagrado 😍"],
  },
  {
    match: /perro|perrito/i,
    requires: ["Mascotas", "Perros"],
    answers: ["Yo también soy team perro 🐶 el mío ocupa la cama entera.", "Amo los perros, no se puede negar."],
  },
  {
    match: /gato|gatito/i,
    requires: ["Mascotas"],
    answers: ["Yo también tengo debilidad por los gatos 🐱", "Team gato también, aunque parezca contradicción."],
  },
  {
    match: /café|cafe/i,
    requires: ["Café", "Cafeterías"],
    answers: ["El café también me mueve la mañana ☕ ¿metodo favorito?"],
  },
  {
    match: /playa/i,
    requires: ["Playa", "Viajes", "Mar"],
    answers: ["La playa también me gana siempre.", "Yo también elegiría playa, sin dudarlo."],
  },
  {
    match: /mate/i,
    requires: ["Mate"],
    answers: ["El mate es un idioma 🧉 coincido totalmente."],
  },
  {
    match: /correr|running|marat[óo]n/i,
    requires: ["Running", "Deportes", "Fitness"],
    answers: ["Yo también corro (lento, pero corro) 🏃", "El running también me atrapó hace un tiempo."],
  },
  {
    match: /teatro|stand ?up|humor/i,
    requires: ["Teatro", "Stand up", "Risa"],
    answers: ["Me encanta ese mundo también 🎭 ¿fuiste a ver algo últimamente?"],
  },
  {
    match: /vinilo|vinilos|dj|club/i,
    requires: ["Vinilos", "Música"],
    answers: ["Los vinilos tienen otra magia 💿 coincido plenamente."],
  },
];

// ------------------------------------------------------------------
// Respuestas por tema cuando la persona tiene el interés: su
// "versión" de la conversación (usada para responder preguntas
// del motor y para diferencias divertidas).
// ------------------------------------------------------------------
const TOPIC_ANSWERS: Record<string, string[]> = {
  musica: [
    "La música es mi territorio: si tuviera que elegir una canción ahora, elegiría una de rock 🤘",
    "Yo escucho de todo un poco, pero el rock me gana.",
  ],
  viajes: [
    "Japón, siempre me llamó la atención.",
    "Me muero por conocer Japón algún día.",
  ],
  comida: [
    "Me encanta cocinar los domingos con mi familia.",
    "Yo hago unas hamburguesas bastante buenas, eso sí 😄",
  ],
  mascotas: ["Tengo un perro enorme que se cree dueño de la casa 🐶"],
  bebidas: ["El mate dulce, siempre. Es no negociable 🧉"],
  cine: ["Soy de series y pelis de suspense, no puedo parar de ver una vez que arranco."],
  deportes: ["El deporte me ordena la cabeza, aunque el cuerpo proteste 😂"],
  familia: ["Mi familia es mi base: domingos todos juntos, regla de oro."],
  trabajo: ["Laburo en algo técnico, pero intento no llevarme el trabajo a casa."],
  arte: ["Me gusta mucho la fotografía: siempre ando con una cámara encima."],
  lectura: ["Leo de noche, aunque al otro día pague las consecuencias 😂"],
  naturaleza: ["El mar me resetea. Año con año, lo mismo y siempre perfecto."],
  juegos: ["Los juegos de mesa son mi debilidad: detesto los de mente, amo los de mesa."],
};

// ------------------------------------------------------------------
// Reacciones cuando NO comparte el tema (diferencias = oportunidad).
// ------------------------------------------------------------------
const DIFFERENCE_ANSWERS: Record<string, string[]> = {
  musica: ["Yo escucho casi exclusivamente reggaetón 😂", "Mmm, la música no es lo mío, soy de podcasts."],
  mascotas: ["Yo soy más de plantas, la verdad 🌱", "Los animales no son lo mío, respeto igual 😄"],
  comida: ["Yo soy horrible cocinando 😂 pero hago unas hamburguesas bastante buenas.", "La cocina no se me da, pido afuera jaja"],
  viajes: ["Yo soy más de quedarme en casa, la verdad 😅", "Viajar me estresa un poco, prefiero planes cortos."],
  deportes: ["Yo y el gimnasio tenemos una relación tóxica 😂", "El deporte no es lo mío, soy de caminatas leves."],
  cine: ["Pelis casi no veo, soy de música todo el día.", "No soy muy de series, me distraigo 😂"],
};

// Follow-ups para invitar a hablar al usuario (sin presionar).
const INVITATIONS = [
  "¿Y vos? Contame 👀",
  "¿Cómo llegaste a eso?",
  "¿Y qué te lleva a elegir eso?",
  "Contá más, me quedé con la intriga 😄",
];

// Acks generales.
const ACKS = ["Jajaja muy bueno 😄", "Qué buena onda", "Me encanta", "Re interesante eso"];

const HOOK_BEATS = [
  "Cuando tenía 20 años me fui solo de viaje por el norte… fue una locura jaja",
  "Una vez me quedé sin plata a mitad de un viaje y me las arreglé igual 😂",
];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pickOne = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function normInterests(interests: string[]): string[] {
  return interests.map((i) => i.toLowerCase());
}

// Los intereses del perfil son ETIQUETAS ("Rock", "Café de especialidad");
// el motor habla en CLAVES ("musica", "bebidas"). Este puente evita que
// un músico diga "la música no es lo mío".
const INTEREST_TOPIC_PATTERNS: Array<[RegExp, string]> = [
  [/música|musica|rock|guitarra|vinilo|concierto|cumbia|reggaetón|banda/, "musica"],
  [/pelis?|cine|serie|netflix/, "cine"],
  [/viaje|destino|mochilero/, "viajes"],
  [/cocina|gastronom|asado|parrilla/, "comida"],
  [/mate|café|cafe|vino|cerveza|trago|termo/, "bebidas"],
  [/mascota|perro|gato/, "mascotas"],
  [/deporte|running|fitness|surf|yoga|fútbol|futbol|gym|correr|maratón|padel/, "deportes"],
  [/lectura|libro|leer/, "lectura"],
  [/arte|foto|diseño|diseno|teatro|pint|stand ?up|humor/, "arte"],
  [/naturaleza|mar|playa|planta|sierra|montaña|jardín/, "naturaleza"],
  [/juego/, "juegos"],
  [/familia/, "familia"],
  [/historia|emprender|tecnología|programación|finanzas/, "trabajo"],
];

function lovesTopic(interests: string[], topic: string): boolean {
  return interests.some((label) =>
    INTEREST_TOPIC_PATTERNS.some(([re, t]) => t === topic && re.test(label.toLowerCase())),
  );
}

export class PersonaSimulator {
  private persona: DemoPersona;
  private emit: Utter;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private userTurnsSinceQuestion = 0;
  private pendingQuestion: Intervention | null = null;
  private droppedHook = false;
  private userTurnCount = 0;
  private disposed = false;

  constructor(persona: DemoPersona, emit: Utter) {
    this.persona = persona;
    this.emit = emit;
  }

  dispose() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private say(text: string, delayMs: number) {
    if (this.disposed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.disposed) return;
      this.timer = null;
      this.emit(text);
    }, delayMs);
  }

  /** Saludo de arranque (la presentación 30s ya ocurrió en el video). */
  greet(myName: string) {
    this.say(`¡Hola ${myName}! Qué buena onda esta ronda 😄`, rand(1500, 2500));
  }

  /** El motor mostró una intervención: la persona responde (o reacciona a lo dicho). */
  onIntervention(i: Intervention) {
    const answered = this.userTurnsSinceQuestion > 0;
    this.userTurnsSinceQuestion = 0;
    this.pendingQuestion = i;
    // Si el usuario ya respondió a la intervención, su reacción ya está
    // programada vía onUserTurn; si no, responde él y devuelve la pelota.
    if (answered) {
      this.pendingQuestion = null;
      return;
    }
    const delay = rand(5500, 9500);
    this.say(this.answerToIntervention(i) + " " + pickOne(INVITATIONS), delay);
  }

  /** El usuario real escribió algo: la persona reacciona en 3–6 s. */
  onUserTurn(text: string) {
    this.userTurnCount++;
    this.userTurnsSinceQuestion++;
    this.pendingQuestion = null;
    const lower = text.toLowerCase();

    // 1) ¿Espejo de coincidencia?
    for (const rule of MIRROR_RULES) {
      if (!rule.match.test(lower)) continue;
      if (rule.requires && !rule.requires.some((r) => normInterests(this.persona.interests).includes(r.toLowerCase()))) continue;
      // La persona comparte el tema → coincidencia real para el motor.
      this.say(pickOne(rule.answers), rand(3200, 6000));
      return;
    }

    // 2) ¿Tema detectado sin regla de espejo pero con interés propio?
    const topics = this.topicsIn(lower);
    if (topics.length > 0 && Math.random() < 0.75) {
      const t = topics[0];
      const loves = lovesTopic(this.persona.interests, t);
      const bank = loves ? TOPIC_ANSWERS[t] : DIFFERENCE_ANSWERS[t] ?? TOPIC_ANSWERS[t];
      this.say(pickOne(bank) + (loves ? "" : " " + pickOne(INVITATIONS)), rand(3400, 6500));
      return;
    }

    // 3) ¿Solta su hook? (una vez por ronda, si la charla viene viva)
    if (!this.droppedHook && this.userTurnCount >= 2 && Math.random() < 0.5) {
      this.droppedHook = true;
      this.say(pickOne(HOOK_BEATS), rand(3500, 6000));
      return;
    }

    // 4) Reacción genérica con invitación.
    this.say(pickOne(ACKS) + " " + pickOne(INVITATIONS), rand(3200, 6000));
  }

  private topicsIn(lower: string): string[] {
    const lexiconHints: Array<[string, RegExp]> = [
      ["musica", /m[úu]sica|canci[óo]n|banda|canto/],
      ["viajes", /viaj|destino|turismo/],
      ["comida", /comi|cocin|asado|pizza|hamburguesa|pasta|morfi/],
      ["mascotas", /perro|gato|mascota/],
      ["bebidas", /mate|caf[ée]|vino|cerveza/],
      ["cine", /peli|serie|cine|netflix/],
      ["deportes", /f[úu]tbol|gym|gimnasio|correr|deporte/],
      ["familia", /familia|herman|mam[áa]|pap[áa]/],
      ["trabajo", /trabajo|laburo|oficina/],
      ["arte", /foto|arte|dise[ñn]o|teatro/],
      ["lectura", /libro|leer|lectura/],
      ["naturaleza", /mar|playa|monta[ñn]a|campo|planta/],
      ["juegos", /juego|jugar|cartas/],
    ];
    const found: string[] = [];
    for (const [t, re] of lexiconHints) {
      if (re.test(lower)) found.push(t);
    }
    return found;
  }

  /** Respuesta de la persona a una intervención del motor. */
  private answerToIntervention(i: Intervention): string {
    const topic = i.relatedTopics[0];
    if (topic) {
      const loves = lovesTopic(this.persona.interests, topic);
      const bank = loves ? TOPIC_ANSWERS[topic] : DIFFERENCE_ANSWERS[topic] ?? TOPIC_ANSWERS[topic];
      if (bank) return pickOne(bank);
    }
    // Sin tema: respuesta cálida y abierta.
    return pickOne([
      "Buena pregunta… la mía va por el lado de la música, siempre.",
      "Uff difícil, pero diría que algo con comida de por medio 😄",
      "Mi respuesta rápida: lo que implique buena charla.",
    ]);
  }
}
