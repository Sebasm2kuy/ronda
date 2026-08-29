// Helpers de fetch del lado cliente

export class ApiError extends Error {
  code: string;
  constructor(message: string, code = "ERROR") {
    super(message);
    this.code = code;
  }
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error ?? "Error inesperado", data?.code ?? "ERROR");
  }
  return data as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  return handle<T>(await fetch(url, { cache: "no-store" }));
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return handle<T>(
    await fetch(url, {
      method: "POST",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  );
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

export async function apiDelete<T>(url: string): Promise<T> {
  return handle<T>(await fetch(url, { method: "DELETE" }));
}
