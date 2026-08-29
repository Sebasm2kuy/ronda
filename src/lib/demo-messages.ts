// Mensajes de bienvenida que envía la persona demo al generarse un match.
// Es un único saludo estático (NO es una IA conversando: RONDA mantiene
// el contacto entre personas 100% humano).

export const DEMO_WELCOME: Record<string, string> = {
  Sofía: "¡Qué lindo conocerte! Me encantó nuestra ronda 🙌 ¿tomamos un café cuando puedas?",
  Martina: "¡Hola! Qué buena onda la tuya. Cuando quieras seguimos la charla con unos mates 🧉",
  Carolina: "¡Hola hola! Me re gustó charlar contigo. Te dejo mi lado fotógrafo a disposición 😄",
  Lucía: "¡Hola! Qué bueno que los dos queramos seguir hablando. Contame cómo sigue tu semana",
  Valentina: "¡Hay conexión! 😃 Jajá me encantó la ronda. Seguimos por acá tranquilo",
  Diego: "¡Buenísimo! Si te gusta comer rico, estamos en la misma página. Seguimos charlando 👨‍🍳",
  Andrés: "¡Hola! La ronda voló, señal de que la charla fluyó. Sigamos por acá",
  Rodrigo: "¡Hola! La charla estuvo buenísima. Te debo una playlist a medida 🎸",
  Martín: "¡Qué gusto! Cuando quieras te preparo el mejor café de Montevideo ☕",
  Federico: "¡Hola! Me hiciste reír más que el stand up del jueves. Seguimos la charla 🎭",
};

export function welcomeFor(name: string): string {
  return (
    DEMO_WELCOME[name] ??
    "¡Hola! Qué lindo que los dos queramos seguir hablando. Cuando quieras seguimos la charla"
  );
}
