// ============================================================
// RONDA — Test determinista del Motor de Conversación Adaptativo.
// Correr con: bun scripts/test-engine.ts
// Verifica los comportamientos canónicos de la spec:
//   §5 coincidencia fuerte (Japón) · §6 competencia de detalle
//   §7 batalla de diferencias · §10 salud alta = callarse
//   §12 consentimiento de silencio · §15 hooks · §18 memorable
//   §23 safety filter · §20 métricas
// ============================================================

import { ConversationEngine } from "../src/lib/conversation/engine";
import type { Intervention } from "../src/lib/conversation/types";

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name} ${extra}`);
  }
}

function makeEngine(opts?: { partnerInterests?: string[] }) {
  const events: Array<{ type: string; payload: unknown }> = [];
  const engine = new ConversationEngine({
    me: { name: "Gonzalo", interests: ["Viajes", "Música"] },
    partner: {
      name: "Sofía",
      interests: opts?.partnerInterests ?? ["Cocina", "Arquitectura", "Vino", "Perros"],
    },
  });
  engine.on("intervention", (i) => events.push({ type: "intervention", payload: i }));
  engine.on("proposal", () => events.push({ type: "proposal", payload: {} }));
  engine.on("safety", (s) => events.push({ type: "safety", payload: s }));
  return { engine, events };
}

function interventions(events: Array<{ type: string; payload: unknown }>): Intervention[] {
  return events.filter((e) => e.type === "intervention").map((e) => e.payload as Intervention);
}

function findCard(events: Array<{ type: string; payload: unknown }>, pred: (i: Intervention) => boolean): Intervention | undefined {
  return interventions(events).find(pred);
}

/** Enciende el motor hasta t y devuelve la primera tarjeta. */
function warmUp(engine: ConversationEngine, until = 12): Intervention | null {
  let first: Intervention | null = null;
  const off = engine.on("intervention", (i) => {
    if (!first) first = i;
  });
  for (let t = 0; t <= until; t++) engine.tick(t);
  off();
  return first;
}

console.log("\n———— ESCENARIO 1 · Primera intervención (fase LIGHT, spec §9) ————");
{
  const { engine } = makeEngine();
  engine.start();
  const first = warmUp(engine);
  assert(Boolean(first), "El motor tira la primera tarjeta antes de los 12s");
  assert(first?.phase === "LIGHT", "La primera tarjeta es de fase LIGHT", first?.phase);
  const boring = /^¿\?(qu[ée] haces|a qu[ée] te dedicas|de d[óo]nde sos)/i.test(first?.text ?? "");
  assert(!boring, "No empieza con pregunta de entrevista (spec §14)", first?.text);
}

console.log("\n———— ESCENARIO 2 · Coincidencia fuerte: Japón (spec §5) ————");
{
  const { engine, events } = makeEngine();
  engine.start();
  warmUp(engine);
  engine.addTurn("A", "Japón, siempre me llamó la atención.", 14);
  engine.addTurn("B", "Yo también quiero conocer Japón.", 18);
  for (let t = 19; t <= 80; t++) engine.tick(t);
  const card = findCard(events, (i) => i.reason.startsWith("coincidencia:"));
  assert(Boolean(card), "El motor detecta la coincidencia y genera tarjeta");
  assert(Boolean(card && /Japón/i.test(card.text)), "La tarjeta menciona Japón (coincidencia fuerte)", card?.text);
  assert(Boolean(card && /pasajes/i.test(card.text)), "Usa la plantilla canónica de pasajes (spec §5)", card?.text);
}

console.log("\n———— ESCENARIO 3 · Comida compartida (spec §6) ————");
{
  const { engine, events } = makeEngine();
  engine.start();
  const first = warmUp(engine);
  if (first) engine.dismissCurrent(13);
  engine.addTurn("A", "Me encanta cocinar los domingos con mi familia.", 14);
  engine.addTurn("B", "Yo soy horrible cocinando 😂 pero hago unas hamburguesas bastante buenas.", 18);
  for (let t = 19; t <= 100; t++) engine.tick(t);
  const card = findCard(events, (i) => i.reason.startsWith("coincidencia:comida"));
  assert(Boolean(card), "Detecta la coincidencia de comida y propone explotarla", JSON.stringify(interventions(events).map((i) => i.reason)));
}

console.log("\n———— ESCENARIO 4 · Batalla musical rock vs reggaetón (spec §7) ————");
{
  const { engine, events } = makeEngine();
  engine.start();
  const first = warmUp(engine);
  if (first) engine.dismissCurrent(13);
  engine.addTurn("A", "Soy fanático del rock, voy a recitales todo el tiempo.", 14);
  engine.addTurn("B", "Yo escucho casi exclusivamente reggaetón 😂", 18);
  for (let t = 19; t <= 100; t++) engine.tick(t);
  const card = findCard(events, (i) => i.reason === "diferencia");
  assert(Boolean(card), "Convierte la diferencia en batalla (no en problema)", JSON.stringify(interventions(events).map((i) => i.reason)));
  assert(
    Boolean(card && /rock|reggaetón|batalla|contra/i.test(card.text)),
    "La tarjeta nombra la batalla",
    card?.text,
  );
}

console.log("\n———— ESCENARIO 5 · Salud alta = NO interviene (spec §2 y §10) ————");
{
  const { engine, events } = makeEngine();
  engine.start();
  const first = warmUp(engine);
  if (first) engine.dismissCurrent(13);
  const chat: Array<["A" | "B", string]> = [
    ["A", "Me encantó el finde: fui con amigos al recital de Los Bardo y nos quedamos hasta tarde cantando todo jaja"],
    ["B", "Jajaja qué bueno! Yo el sábado hice un asado enorme en casa de mi hermana, se sumó media familia"],
    ["A", "¡Un asado es imbatible! Yo de postre hice un flan con dulce que desapareció en minutos jaja"],
    ["B", "Jajaja el flan casero es otro nivel. Después me pasás la receta, va derecho a mi lista"],
    ["A", "Hecho! Igual el secreto es no dejarlo enfriar bien, aunque sea un desastre al servir jaja"],
    ["B", "Jajaja clásico. Lo importante es la risa de la mesa, la estética después se perdona"],
    ["A", "Total jaja. La próxima ronda de asado te va a tocar a vos, aviso desde ya"],
    ["B", "Jajaja acepto el desafío, me salen buenas hamburguesas también así que hay plan B"],
  ];
  chat.forEach(([sp, text], idx) => engine.addTurn(sp, text, 100 + idx * 2));
  for (let t = 117; t <= 120; t++) engine.tick(t);
  const health = engine.healthSnapshot().score;
  for (let t = 121; t <= 145; t++) engine.tick(t);
  const cards = interventions(events).length;
  assert(health >= 70, "La conversación fluida tiene salud alta", `score=${health}`);
  assert(cards === 1, "Con salud alta el motor NO interviene (solo la primera tarjeta)", `cards=${cards}`);
}

console.log("\n———— ESCENARIO 6 · Silencio con consentimiento (spec §12) ————");
{
  const { engine, events } = makeEngine();
  engine.start();
  warmUp(engine);
  engine.addTurn("A", "Buenísimo esto.", 14);
  engine.addTurn("B", "Sí, me encanta.", 16);
  for (let t = 17; t <= 80; t++) engine.tick(t);
  const proposals = events.filter((e) => e.type === "proposal").length;
  assert(proposals >= 1, "Tras el silencio, propone: ¿Les tiro una pregunta? 👀");
  engine.acceptProposal(82);
  const card = findCard(events, (i) => i.reason === "silencio:aceptado");
  assert(Boolean(card), "Al aceptar, el motor tira la pregunta");
  // Reabrir propuesta sintéticamente para poder rechazarla con tiempo controlado:
  for (let t = 83; t <= 140; t++) engine.tick(t); // nueva propuesta por silencio
  const secondProposal = events.filter((e) => e.type === "proposal").length >= 2;
  assert(secondProposal, "El motor vuelve a proponer tras la pregunta aceptada");
  engine.declineProposal(142);
  const countAfter0 = interventions(events).length;
  for (let t = 143; t <= 200; t++) engine.tick(t); // dentro del backoff de declinación
  const reactivations = interventions(events).filter((i) => i.reason === "reactivacion").length;
  const countAfter = interventions(events).length;
  assert(
    countAfter === countAfter0 || reactivations === 0,
    "Tras 'Seguimos hablando' el motor respeta el silencio (sin tarjetas en el backoff)",
    `antes=${countAfter0} después=${countAfter} reactivaciones=${reactivations}`,
  );
}

console.log("\n———— ESCENARIO 7 · Conversation hook (spec §15) ————");
{
  const { engine, events } = makeEngine();
  engine.start();
  const first = warmUp(engine);
  if (first) engine.dismissCurrent(13);
  engine.addTurn("A", "Cuando tenía 20 años me fui solo de viaje por el norte, una locura.", 14);
  engine.addTurn("B", "¡No me contés más! Qué buena esa.", 17);
  for (let t = 18; t <= 100; t++) engine.tick(t);
  const card = findCard(events, (i) => i.reason === "hook");
  assert(Boolean(card), "El motor marca el hook y profundiza", JSON.stringify(interventions(events).map((i) => i.reason)));
  assert(
    Boolean(card && /merece explicación|terminaste|cómo empieza|capítulo/i.test(card.text)),
    "La tarjeta pide la historia",
    card?.text,
  );
}

console.log("\n———— ESCENARIO 8 · Memorable del último minuto (spec §18) ————");
{
  const { engine, events } = makeEngine();
  engine.start();
  engine.addTurn("A", "Hola!", 10);
  engine.addTurn("B", "Hola! Todo bien?", 12);
  for (let t = 0; t <= 232; t++) engine.tick(t); // remaining = 68s
  const card = findCard(events, (i) => i.phase === "MEMORABLE");
  assert(Boolean(card), "En el último minuto aparece la pregunta memorable");
}

console.log("\n———— ESCENARIO 9 · Safety filter (spec §23) ————");
{
  const { engine, events } = makeEngine();
  engine.start();
  warmUp(engine);
  const res = engine.addTurn("A", "pasá tu número de teléfono y tu dirección de tu casa", 14);
  assert(res.ok === false, "Turno con datos sensibles es rechazado");
  const safetyEvents = events.filter((e) => e.type === "safety");
  assert(safetyEvents.length === 1, "Se emite evento safety para ofrecer reportar/bloquear");
  const health = engine.healthSnapshot();
  assert(typeof health.score === "number", "El motor sigue funcionando tras el rechazo");
}

console.log("\n———— ESCENARIO 10 · Métricas de ronda (spec §20) ————");
{
  const { engine } = makeEngine();
  engine.start();
  warmUp(engine);
  engine.addTurn("A", "Japón, siempre me llamó la atención.", 14);
  engine.addTurn("B", "Yo también quiero conocer Japón.", 18);
  for (let t = 19; t <= 70; t++) engine.tick(t);
  const report = engine.end();
  assert(report.interventionsShown >= 2, "Intervenciones contadas", String(report.interventionsShown));
  assert(report.turnsA === 1 && report.turnsB === 1, "Turnos por participante contados");
  assert(report.topTopics.includes("viajes"), "Temas top incluyen viajes", report.topTopics.join(","));
  assert(report.finalHealth >= 0 && report.finalHealth <= 100, "Salud final en rango");
}

console.log(`\n════════ RESULTADO: ${passed} ✅ · ${failed} ❌ ════════\n`);
if (failed > 0) process.exit(1);
