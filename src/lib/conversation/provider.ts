// ============================================================
// RONDA — Motor de Conversación Adaptativo
// provider.ts — capa de proveedores de IA (spec §21).
//
// El motor NUNCA debe quedar acoplado a una API concreta:
//
//   - En MODO DEMO (spec §22), la "generación" la hace el motor
//     de reglas (engine.ts + content/*). No hay proveedor remoto.
//
//   - Con IA real, se escribe una clase que implemente AIProvider
//     (interface en types.ts) y se registra acá. Cambiar de
//     proveedor = cambiar UNA clase. Nada más.
//
// Este módulo tampoco llama a ninguna API hoy: RemoteAIProvider
// es el stub documentado del contrato futuro.
// ============================================================

import type { AIProvider, ConversationPayload, Intervention } from "./types";
import { screenGenerated, SAFE_FALLBACK_INTERVENTION } from "./safety";
import { buildPrompt } from "./prompt-builder";

/**
 * Stub de proveedor remoto: NO llama a ninguna API hasta que
 * exista configuración real (AI_MODE=true + endpoint).
 */
export class RemoteAIProvider implements AIProvider {
  readonly name = "remote-llm";
  private endpoint: string | null;

  constructor(endpoint?: string | null) {
    this.endpoint =
      endpoint ??
      (typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_AI_ENDPOINT ?? null) : null);
  }

  isConfigured(): boolean {
    return Boolean(this.endpoint) && process.env.NEXT_PUBLIC_AI_MODE === "true";
  }

  async generate(payload: ConversationPayload): Promise<Intervention | null> {
    if (!this.isConfigured()) {
      // Sin IA configurada: null = "que siga el motor de reglas (modo demo)".
      return null;
    }
    // CONTRATO FUTURO (IA real):
    //   1. const prompt = buildPrompt(payload)
    //   2. POST al endpoint con { prompt, payload }
    //   3. mapear respuesta → { text }
    //   4. VALIDAR SIEMPRE con screenGenerated() antes de mostrar
    //      (el Safety Filter también aplica a la IA real, spec §23)
    //   5. nunca enviar audio/video ni datos identificables (spec §24)
    void prompt; // placeholder hasta implementación
    console.info("[RONDA] RemoteAIProvider: configurado pero aún no implementado; se usa el motor de reglas.");
    return null;
  }
}

/**
 * Devuelve el proveedor activo. Hoy siempre es demo (el motor
 * de reglas). Cuando exista IA real: registrar la clase acá.
 */
export function resolveProvider(): AIProvider {
  const remote = new RemoteAIProvider();
  if (remote.isConfigured()) return remote;
  return {
    name: "demo-rules",
    async generate(_payload: ConversationPayload): Promise<Intervention | null> {
      // En demo la generación corre dentro del motor de reglas.
      return null;
    },
  };
}

/** Utilidad exportada para el futuro: valida texto de cualquier proveedor. */
export function validateProviderText(text: string): string {
  return screenGenerated(text) ? text : SAFE_FALLBACK_INTERVENTION;
}
