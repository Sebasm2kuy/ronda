// Wrapper mínimo de IndexedDB para el backend simulado de RONDA.
// En el MVP estático (GitHub Pages) no hay servidor: los datos viven
// en el navegador del usuario. La interfaz replica las operaciones
// que el backend real hace con Prisma.

const DB_NAME = "ronda-db";
const DB_VERSION = 1;

export const STORES = {
  KV: "kv",
  USERS: "users",
  ROUNDS: "rounds",
  CONNECTIONS: "connections",
  MESSAGES: "messages",
  ATTENDEES: "attendees",
  REPORTS: "reports",
  BLOCKS: "blocks",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB no disponible"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.KV)) db.createObjectStore(STORES.KV);
      for (const s of [STORES.USERS, STORES.ROUNDS, STORES.CONNECTIONS, STORES.MESSAGES, STORES.ATTENDEES, STORES.REPORTS, STORES.BLOCKS]) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("No se pudo abrir la base local"));
  });
  return dbPromise;
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("Error de base local"));
      })
  );
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return tx<T | undefined>(STORES.KV, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await tx(STORES.KV, "readwrite", (s) => s.put(value, key));
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  return tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export async function getById<T>(store: StoreName, id: string): Promise<T | undefined> {
  return tx<T | undefined>(store, "readonly", (s) => s.get(id) as IDBRequest<T | undefined>);
}

export async function put<T extends { id: string }>(store: StoreName, value: T): Promise<T> {
  await tx(store, "readwrite", (s) => s.put(value));
  return value;
}

export async function del(store: StoreName, id: string): Promise<void> {
  await tx(store, "readwrite", (s) => s.delete(id));
}

export async function clearStore(store: StoreName): Promise<void> {
  await tx(store, "readwrite", (s) => s.clear());
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
