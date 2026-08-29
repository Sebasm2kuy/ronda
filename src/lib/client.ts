// Helpers de API del lado cliente.
// En el MVP estático (GitHub Pages) todas las llamadas se resuelven
// con el backend simulado en el navegador (src/lib/local-api.ts).
// Para volver a un backend real: reemplazar handle() por fetch().

import { handleApi } from "@/lib/local-api";
export { ApiError } from "@/lib/errors";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function handle<T>(method: string, url: string, body?: unknown): Promise<T> {
  await sleep(60 + Math.random() * 140);
  return handleApi<T>(method, url, body as Record<string, unknown> | undefined);
}

export async function apiGet<T>(url: string): Promise<T> {
  return handle<T>("GET", url);
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return handle<T>("POST", url, body);
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  return handle<T>("PATCH", url, body);
}

export async function apiDelete<T>(url: string): Promise<T> {
  return handle<T>("DELETE", url);
}
