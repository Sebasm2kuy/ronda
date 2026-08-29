// ============================================================
// RONDA — Motor de Conversación Adaptativo
// safety.ts — Safety Filter (spec §23).
//
// La IA NO genera: sexual explícito, acoso, insultos,
// discriminación, manipulación, preguntas invasivas ni
// pedidos de datos personales sensibles.
//
// Se usa en dos direcciones:
//   1. screenGenerated → filtra TODO texto que el motor muestre
//      (obligatorio también para un futuro proveedor de IA real).
//   2. screenTurn → detecta turnos problemáticos para ofrecer
//      REPORTAR / BLOQUEAR / SALIR (nunca para "castigar").
//
// Enfoque conservador: ante duda, el texto se reemplaza por una
// intervención genérica segura. Sin almacenamiento: solo memoria.
// ============================================================

export type SafetyCategory =
  | "SEXUAL"
  | "HARASSMENT"
  | "DISCRIMINATION"
  | "SENSITIVE_DATA"
  | "MANIPULATION";

export interface SafetyVerdict {
  ok: boolean;
  category: SafetyCategory | null;
}

const PATTERNS: Array<{ category: SafetyCategory; re: RegExp }> = [
  // Sexual explícito
  { category: "SEXUAL", re: /\b(porno|expl[ií]cito|sexualidad expl[ií]cita|nudes|sexo anal|tetas|pene|vagina)\b/i },
  // Acoso / insultos
  { category: "HARASSMENT", re: /\b(est[úu]pid[oa]|idiota|imbecil|bobo[oa] de mierda|call[aá]te la boca|soser[íi]a)\b/i },
  // Discriminación
  { category: "DISCRIMINATION", re: /\b(racista|homof[oó]b|transf[oó]b|jud[íi]o de mierda|negro de mierda|discapacitado de mierda)\b/i },
  // Datos personales sensibles / preguntas invasivas
  { category: "SENSITIVE_DATA", re: /\b(n[úu]mero de tel[ée]fono|direcci[óo]n de tu casa|cu[áa]l es tu direcci[óo]n|tu cuenta bancaria|tu clave|n[úu]mero de documento|c[ée]dula|c[óo]mo gan[áa]s lo suficiente|enfermedad grave)\b/i },
  // Manipulación
  { category: "MANIPULATION", re: /\b(si me quer[ée]s|si de verdad me quer[ée]s|no me va(s) a contar\?|demostrame que conf[ií]as)\b/i },
];

export function screenText(text: string): SafetyVerdict {
  for (const { category, re } of PATTERNS) {
    if (re.test(text)) return { ok: false, category };
  }
  return { ok: true, category: null };
}

/** Filtra texto generado por el motor o por un proveedor de IA. */
export function screenGenerated(text: string): boolean {
  return screenText(text).ok;
}

/** Evalúa un turno de usuario (para ofrecer reportar/bloquear si corresponde). */
export function screenTurn(text: string): SafetyVerdict {
  return screenText(text);
}

/** Fallback seguro si un proveedor de IA futuro devuelve algo problemático. */
export const SAFE_FALLBACK_INTERVENTION =
  "Pregunta simple para ambos: ¿qué cosa chica les hizo sonreír hoy?";
