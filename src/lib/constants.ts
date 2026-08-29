// Constantes compartidas de RONDA

export const USER_STATUS = {
  AVAILABLE: "disponible",
  WAITING: "esperando",
  IN_ROUND: "en ronda",
  ROUND_ENDED: "terminó ronda",
  CONNECTED: "conexión",
} as const;

export type UserStatus = keyof typeof USER_STATUS;

export const GENDERS = [
  { value: "FEMALE", label: "Mujer" },
  { value: "MALE", label: "Hombre" },
  { value: "NON_BINARY", label: "No binario" },
] as const;

export const LOOKING_FOR = [
  { value: "RELATIONSHIP", label: "Una relación", hint: "Algo serio, sin apuro" },
  { value: "MEET_PEOPLE", label: "Conocer gente", hint: "Abrir el círculo, ver qué pasa" },
  { value: "FRIENDSHIP", label: "Amistad", hint: "Buena charla y buena onda" },
] as const;

export const PREFERENCES = [
  { value: "WOMEN", label: "Mujeres" },
  { value: "MEN", label: "Hombres" },
  { value: "EVERYONE", label: "Todas las personas" },
] as const;

export const INTEREST_OPTIONS = [
  "Música", "Cine", "Cocina", "Viajes", "Deportes", "Lectura",
  "Arte", "Tecnología", "Naturaleza", "Fitness", "Gastronomía", "Fotografía",
  "Juegos de mesa", "Baile", "Café", "Vino", "Mascotas", "Teatro",
] as const;

export const ROUND_SECONDS = 5 * 60; // 5:00
export const PRESENTATION_SECONDS = 30;

export const CHOICES = {
  WANT_MORE: { label: "QUIERO VOLVER A HABLAR", emoji: "❤️" },
  GOOD_VIBES: { label: "ME CAE MUY BIEN", emoji: "🙂" },
  NEXT: { label: "SIGUIENTE", emoji: "👋" },
} as const;

export type ChoiceValue = keyof typeof CHOICES;

export const REPORT_REASONS = [
  { value: "INAPPROPRIATE", label: "Comportamiento inapropiado" },
  { value: "HARASSMENT", label: "Acoso" },
  { value: "FAKE_PROFILE", label: "Perfil falso" },
  { value: "OTHER", label: "Otro motivo" },
] as const;

export function labelFor(value: string, options: ReadonlyArray<{ value: string; label: string }>): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function parseInterests(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
