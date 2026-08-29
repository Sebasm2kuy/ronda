// ============================================================
// RONDA — Backend simulado en el navegador (MVP estático)
//
// GitHub Pages solo sirve archivos estáticos, así que toda la
// lógica del MVP corre del lado cliente sobre IndexedDB.
// Este módulo replica 1:1 los endpoints del backend real
// (src/app/api/*) para que las páginas no cambien.
//
// Cuando exista backend real, basta con volver a enrutar
// src/lib/client.ts hacia fetch().
// ============================================================

import {
  STORES, getAll, getById, put, del, kvGet, kvSet, uid, clearStore,
} from "@/lib/idb";
import { DEMO_USERS, DEMO_EVENTS, ICEBREAKERS, DEMO_ROUND } from "@/lib/demo-data";
import { welcomeFor } from "@/lib/demo-messages";
import type {
  PublicUser, RoundInfo, ConnectionInfo, ChatMessage, EventInfo, LiveStatus, AdminStats,
} from "@/lib/types";
import { ApiError } from "@/lib/errors";

// ---------- tipos locales ----------

export interface LocalUser {
  id: string;
  email: string;
  name: string;
  age: number;
  city: string;
  gender: string;
  lookingFor: string;
  preference: string;
  interests: string[];
  bio: string | null;
  photoUrl: string | null;
  videoUrl: string | null;
  status: string;
  isDemo: boolean;
  provider: string;
  createdAt: string;
}

interface LocalRound {
  id: string;
  userAId: string;
  userBId: string;
  status: string; // ACTIVE | COMPLETED | CANCELLED
  startedAt: string;
  endedAt: string | null;
  choiceA: string | null;
  choiceB: string | null;
}

interface LocalConnection {
  id: string;
  userAId: string;
  userBId: string;
  roundId: string | null;
  status: string; // ACTIVE | PENDING | ENDED
  createdAt: string;
}

interface LocalMessage {
  id: string;
  connectionId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface LocalAttendee { id: string; eventId: string; userId: string }
interface LocalReport {
  id: string; reporterId: string; reportedId: string; reason: string;
  details: string | null; status: string; createdAt: string;
}
interface LocalBlock { id: string; blockerId: string; blockedId: string; createdAt: string }

const SEED_KEY = "seeded-v1";
const SESSION_KEY = "session-user-id";
const ADMIN_KEY = "admin-until";
export const DEMO_ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? "ronda2026";

// ---------- utilidades ----------

function nowIso(): string {
  return new Date().toISOString();
}

function latency(): Promise<void> {
  return new Promise((r) => setTimeout(r, 90 + Math.random() * 220));
}

function err(status: number, error: string, code?: string): never {
  throw new ApiError(error, code ?? "ERROR");
}

function toPublicUser(u: LocalUser): PublicUser {
  const { email: _email, ...pub } = u;
  return pub;
}

async function requireUser(): Promise<LocalUser> {
  const id = await kvGet<string>(SESSION_KEY);
  if (!id) err(401, "No autenticado", "NO_AUTH");
  const user = await getById<LocalUser>(STORES.USERS, id);
  if (!user) err(401, "No autenticado", "NO_AUTH");
  return user;
}

// ---------- seed inicial ----------

let seeding: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seeding) return seeding;
  seeding = (async () => {
    const done = await kvGet<boolean>(SEED_KEY);
    if (done) return;

    const existing = await getAll<LocalUser>(STORES.USERS);
    if (existing.length === 0) {
      for (const d of DEMO_USERS) {
        const user: LocalUser = {
          id: d.id,
          email: `${d.id}@demo.ronda.uy`,
          name: d.name,
          age: d.age,
          city: d.city,
          gender: d.gender,
          lookingFor: d.lookingFor,
          preference: d.preference,
          interests: d.interests,
          bio: d.bio,
          photoUrl: d.photoUrl,
          videoUrl: d.videoUrl,
          status: d.status,
          isDemo: true,
          provider: "demo",
          createdAt: nowIso(),
        };
        await put(STORES.USERS, user);
      }

      // Ronda demo activa (Martina ↔ Federico), igual que el seed del backend
      const a = DEMO_ROUND.userAId, b = DEMO_ROUND.userBId;
      await put<LocalRound>(STORES.ROUNDS, {
        id: "demo-round-1", userAId: a, userBId: b,
        status: "ACTIVE", startedAt: nowIso(), endedAt: null, choiceA: null, choiceB: null,
      });
      const ua = await getById<LocalUser>(STORES.USERS, a);
      const ub = await getById<LocalUser>(STORES.USERS, b);
      if (ua) { ua.status = "IN_ROUND"; await put(STORES.USERS, ua); }
      if (ub) { ub.status = "IN_ROUND"; await put(STORES.USERS, ub); }
    }

    await kvSet(SEED_KEY, true);
  })();
  try {
    await seeding;
  } finally {
    seeding = null;
  }
}

// ---------- matching (espejo de matching.ts) ----------

function genderMatches(candidateGender: string, preference: string): boolean {
  if (preference === "EVERYONE") return true;
  if (preference === "WOMEN") return candidateGender === "FEMALE" || candidateGender === "NON_BINARY";
  if (preference === "MEN") return candidateGender === "MALE" || candidateGender === "NON_BINARY";
  return true;
}

async function findPartner(user: LocalUser): Promise<LocalUser | null> {
  const blocks = await getAll<LocalBlock>(STORES.BLOCKS);
  const excluded = new Set<string>([user.id]);
  for (const b of blocks) {
    if (b.blockerId === user.id) excluded.add(b.blockedId);
    if (b.blockedId === user.id) excluded.add(b.blockerId);
  }

  const users = await getAll<LocalUser>(STORES.USERS);
  const candidates = users.filter(
    (u) => u.isDemo && u.status === "AVAILABLE" && !excluded.has(u.id)
  );

  const mutual = candidates.filter(
    (c) => genderMatches(c.gender, user.preference) && genderMatches(user.gender, c.preference)
  );
  if (mutual.length > 0) return mutual[Math.floor(Math.random() * mutual.length)];

  if (candidates.length > 0) return candidates[Math.floor(Math.random() * candidates.length)];

  const busy = users.filter(
    (u) => u.isDemo && ["WAITING", "ROUND_ENDED"].includes(u.status) && !excluded.has(u.id)
  );
  if (busy.length > 0) {
    const chosen = busy[Math.floor(Math.random() * busy.length)];
    chosen.status = "AVAILABLE";
    await put(STORES.USERS, chosen);
    return chosen;
  }

  return users.find((u) => u.isDemo && !excluded.has(u.id)) ?? null;
}

function roundView(round: LocalRound, partner: LocalUser): RoundInfo {
  return { id: round.id, status: round.status, startedAt: round.startedAt, partner: toPublicUser(partner) };
}

// ---------- subida de medios (dataURL en lugar de archivos) ----------

const MEDIA_LIMITS: Record<string, number> = { photos: 8 * 1024 * 1024, videos: 40 * 1024 * 1024 };

export async function saveMediaBlob(blob: Blob, kind: "photos" | "videos"): Promise<string> {
  const limit = MEDIA_LIMITS[kind] ?? 8 * 1024 * 1024;
  if (blob.size > limit) {
    err(400, `Archivo demasiado grande (máx ${Math.round(limit / 1024 / 1024)}MB)`);
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ApiError("No se pudo procesar el archivo"));
    reader.readAsDataURL(blob);
  });
}

// ---------- dispatcher principal ----------

type Body = Record<string, unknown> | undefined;

export async function handleApi<T>(method: string, rawUrl: string, body?: Body): Promise<T> {
  await ensureSeeded();
  await latency();

  const [path, query] = rawUrl.split("?");
  const q = new URLSearchParams(query ?? "");
  const seg = path.replace(/\/+$/, "").split("/").filter(Boolean); // ["api", ...]

  const M = method.toUpperCase();

  // ---- públicas ----
  if (M === "GET" && path === "/api/stats") return statsLive() as Promise<T>;
  if (M === "GET" && path === "/api/icebreakers") {
    const shuffled = [...ICEBREAKERS].sort(() => Math.random() - 0.5);
    return { questions: shuffled } as T;
  }
  if (M === "POST" && path === "/api/admin/login") {
    const pin = String(body?.pin ?? "");
    if (pin !== DEMO_ADMIN_PIN) err(401, "PIN incorrecto");
    await kvSet(ADMIN_KEY, Date.now() + 4 * 60 * 60 * 1000);
    return { ok: true } as T;
  }
  if (M === "GET" && path === "/api/admin/stats") {
    const until = (await kvGet<number>(ADMIN_KEY)) ?? 0;
    if (Date.now() > until) err(401, "No autorizado");
    return adminStats() as Promise<T>;
  }

  // ---- auth ----
  if (M === "POST" && path === "/api/auth/register") return register(body) as Promise<T>;
  if (M === "POST" && path === "/api/auth/logout") {
    await kvSet(SESSION_KEY, null);
    return { ok: true } as T;
  }
  if (M === "GET" && path === "/api/auth/session") {
    const id = await kvGet<string>(SESSION_KEY);
    if (!id) return { user: null } as T;
    const user = await getById<LocalUser>(STORES.USERS, id);
    return { user: user ? toPublicUser(user) : null } as T;
  }

  // ---- resto: requiere sesión ----
  const me = await requireUser();

  if (path === "/api/users/me") {
    if (M === "GET") return { user: toPublicUser(me) } as T;
    if (M === "PATCH") return patchMe(me, body) as Promise<T>;
  }

  if (M === "POST" && path === "/api/rounds/join") return joinRound(me) as Promise<T>;

  let m = path.match(/^\/api\/rounds\/([^/]+)$/);
  if (M === "GET" && m) {
    const round = await getById<LocalRound>(STORES.ROUNDS, m[1]);
    if (!round || (round.userAId !== me.id && round.userBId !== me.id)) err(404, "Ronda no encontrada");
    const partnerId = round.userAId === me.id ? round.userBId : round.userAId;
    const partner = await getById<LocalUser>(STORES.USERS, partnerId);
    if (!partner) err(404, "Ronda no encontrada");
    return { round: roundView(round, partner) } as T;
  }

  m = path.match(/^\/api\/rounds\/([^/]+)\/finish$/);
  if (M === "POST" && m) {
    const round = await getById<LocalRound>(STORES.ROUNDS, m[1]);
    if (!round || (round.userAId !== me.id && round.userBId !== me.id)) err(404, "Ronda no encontrada");
    if (round.status === "ACTIVE") {
      round.status = "COMPLETED";
      round.endedAt = nowIso();
      await put(STORES.ROUNDS, round);
      for (const uid2 of [round.userAId, round.userBId]) {
        const u = await getById<LocalUser>(STORES.USERS, uid2);
        if (u) { u.status = "ROUND_ENDED"; await put(STORES.USERS, u); }
      }
    }
    return { ok: true } as T;
  }

  m = path.match(/^\/api\/rounds\/([^/]+)\/leave$/);
  if (M === "POST" && m) {
    const round = await getById<LocalRound>(STORES.ROUNDS, m[1]);
    if (!round || (round.userAId !== me.id && round.userBId !== me.id)) err(404, "Ronda no encontrada");
    if (round.status === "ACTIVE") {
      round.status = "CANCELLED";
      round.endedAt = nowIso();
      await put(STORES.ROUNDS, round);
      for (const uid2 of [round.userAId, round.userBId]) {
        const u = await getById<LocalUser>(STORES.USERS, uid2);
        if (u) { u.status = "AVAILABLE"; await put(STORES.USERS, u); }
      }
    }
    return { ok: true } as T;
  }

  m = path.match(/^\/api\/rounds\/([^/]+)\/choice$/);
  if (M === "POST" && m) return choice(me, m[1], body) as Promise<T>;

  if (M === "GET" && path === "/api/connections") return connectionsList(me) as Promise<T>;

  m = path.match(/^\/api\/connections\/([^/]+)\/messages$/);
  if (m) {
    const conn = await getById<LocalConnection>(STORES.CONNECTIONS, m[1]);
    if (!conn || (conn.userAId !== me.id && conn.userBId !== me.id)) err(404, "Conversación no encontrada");
    if (M === "GET") return messagesList(me, conn, q.get("after")) as Promise<T>;
    if (M === "POST") return messageSend(me, conn, body) as Promise<T>;
  }

  if (M === "GET" && path === "/api/events") return eventsList(me) as Promise<T>;

  m = path.match(/^\/api\/events\/([^/]+)\/join$/);
  if (m) {
    const already = (await getAll<LocalAttendee>(STORES.ATTENDEES))
      .some((a) => a.eventId === m![1] && a.userId === me.id);
    if (M === "POST") {
      if (already) return { ok: true, joined: true } as T;
      const evt = DEMO_EVENTS.find((e) => e.id === m![1]);
      if (!evt) err(404, "Evento no encontrado");
      const count = (await getAll<LocalAttendee>(STORES.ATTENDEES)).filter((a) => a.eventId === m![1]).length;
      if (count >= evt.capacity) err(409, "Se agotaron los lugares");
      await put<LocalAttendee>(STORES.ATTENDEES, { id: uid(), eventId: m![1], userId: me.id });
      return { ok: true, joined: true } as T;
    }
    if (M === "DELETE") {
      for (const a of (await getAll<LocalAttendee>(STORES.ATTENDEES)).filter((x) => x.eventId === m![1] && x.userId === me.id)) {
        await del(STORES.ATTENDEES, a.id);
      }
      return { ok: true, joined: false } as T;
    }
  }

  if (M === "POST" && path === "/api/reports") {
    const reportedId = String(body?.reportedId ?? "");
    const reason = String(body?.reason ?? "");
    if (!reportedId || !["INAPPROPRIATE", "HARASSMENT", "FAKE_PROFILE", "OTHER"].includes(reason)) {
      err(400, "Datos de denuncia incompletos");
    }
    const reported = await getById<LocalUser>(STORES.USERS, reportedId);
    if (!reported) err(404, "Usuario no encontrado");
    const report: LocalReport = {
      id: uid(), reporterId: me.id, reportedId, reason,
      details: typeof body?.details === "string" ? (body.details as string).slice(0, 500) : null,
      status: "OPEN", createdAt: nowIso(),
    };
    await put(STORES.REPORTS, report);
    return { ok: true, reportId: report.id } as T;
  }

  if (M === "POST" && path === "/api/blocks") {
    const blockedId = String(body?.blockedId ?? "");
    if (!blockedId || blockedId === me.id) err(400, "Usuario inválido");
    const target = await getById<LocalUser>(STORES.USERS, blockedId);
    if (!target) err(404, "Usuario no encontrado");
    await put<LocalBlock>(STORES.BLOCKS, { id: uid(), blockerId: me.id, blockedId, createdAt: nowIso() });
    for (const c of await getAll<LocalConnection>(STORES.CONNECTIONS)) {
      const pair =
        (c.userAId === me.id && c.userBId === blockedId) ||
        (c.userAId === blockedId && c.userBId === me.id);
      if (pair && c.status === "ACTIVE") {
        c.status = "ENDED";
        await put(STORES.CONNECTIONS, c);
      }
    }
    return { ok: true } as T;
  }

  err(404, "Ruta no encontrada");
}

// ---------- handlers ----------

async function statsLive(): Promise<LiveStatus> {
  const users = await getAll<LocalUser>(STORES.USERS);
  const available = users.filter((u) => u.status === "AVAILABLE").length;
  const inRound = users.filter((u) => u.status === "IN_ROUND").length;
  const connected = users.filter((u) => u.status === "CONNECTED").length;
  const minuteSeed = Math.floor(Date.now() / 60000) % 5;
  const jitter = minuteSeed - 2;
  return {
    available: Math.max(1, available + jitter),
    inRound: Math.max(0, inRound),
    connected: Math.max(1, available + inRound + connected + jitter),
  };
}

async function register(body: Body): Promise<{ user: PublicUser }> {
  const name = String(body?.name ?? "");
  const age = Number(body?.age);
  const city = String(body?.city ?? "");
  const gender = String(body?.gender ?? "");
  const lookingFor = String(body?.lookingFor ?? "");
  const preference = String(body?.preference ?? "");
  const photoUrl = body?.photoUrl;

  if (name.trim().length < 2 || name.trim().length > 40) err(400, "El nombre debe tener entre 2 y 40 caracteres");
  if (!Number.isInteger(age) || age < 18 || age > 99) err(400, "RONDA es exclusivamente para mayores de 18 años");
  if (city.trim().length < 2) err(400, "Ingresá tu ciudad");
  if (!["FEMALE", "MALE", "NON_BINARY"].includes(gender)) err(400, "Género inválido");
  if (!["RELATIONSHIP", "MEET_PEOPLE", "FRIENDSHIP"].includes(lookingFor)) err(400, "Qué buscás es obligatorio");
  if (!["WOMEN", "MEN", "EVERYONE"].includes(preference)) err(400, "Preferencia inválida");
  if (body?.acceptTerms !== true || body?.acceptAge !== true) {
    err(400, "Necesitamos que aceptes los términos y confirmes tu edad");
  }

  const interests = Array.isArray(body?.interests)
    ? (body!.interests as unknown[]).filter((i): i is string => typeof i === "string").slice(0, 12)
    : [];
  const photo =
    typeof photoUrl === "string" && (photoUrl.startsWith("data:") || photoUrl.startsWith("/")) ? photoUrl : null;

  const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "").slice(0, 12) || "user";
  const user: LocalUser = {
    id: uid(),
    email: `${slug}.${Date.now().toString(36)}@ronda.local`,
    name: name.trim(),
    age,
    city: city.trim(),
    gender,
    lookingFor,
    preference,
    interests,
    bio: null,
    photoUrl: photo,
    videoUrl: null,
    status: "AVAILABLE",
    isDemo: false,
    provider: "email",
    createdAt: nowIso(),
  };
  await put(STORES.USERS, user);
  await kvSet(SESSION_KEY, user.id);
  return { user: toPublicUser(user) };
}

async function patchMe(me: LocalUser, body: Body): Promise<{ user: PublicUser }> {
  if (typeof body?.photoUrl === "string" && (body.photoUrl.startsWith("data:") || body.photoUrl.startsWith("/"))) {
    me.photoUrl = body.photoUrl;
  }
  if (typeof body?.videoUrl === "string" && (body.videoUrl.startsWith("data:") || body.videoUrl.startsWith("/"))) {
    me.videoUrl = body.videoUrl;
  }
  if (typeof body?.bio === "string") me.bio = (body.bio as string).slice(0, 240);
  if (Array.isArray(body?.interests)) {
    me.interests = (body!.interests as unknown[]).filter((i): i is string => typeof i === "string").slice(0, 12);
  }
  if (typeof body?.city === "string" && body.city.trim().length >= 2) me.city = body.city.trim().slice(0, 60);
  await put(STORES.USERS, me);
  return { user: toPublicUser(me) };
}

async function joinRound(me: LocalUser): Promise<{ round: RoundInfo }> {
  if (!me.photoUrl) err(400, "Primero completá tu foto de perfil", "NO_PHOTO");

  // Reutilizar ronda activa existente
  for (const r of await getAll<LocalRound>(STORES.ROUNDS)) {
    if (r.status === "ACTIVE" && (r.userAId === me.id || r.userBId === me.id)) {
      const partnerId = r.userAId === me.id ? r.userBId : r.userAId;
      const partner = await getById<LocalUser>(STORES.USERS, partnerId);
      if (partner) return { round: roundView(r, partner) };
    }
  }

  const partner = await findPartner(me);
  if (!partner) err(503, "Ahora no hay nadie disponible. Probá en unos minutos.", "NO_PARTNER");

  const round: LocalRound = {
    id: uid(), userAId: me.id, userBId: partner.id,
    status: "ACTIVE", startedAt: nowIso(), endedAt: null, choiceA: null, choiceB: null,
  };
  await put(STORES.ROUNDS, round);
  me.status = "IN_ROUND";
  await put(STORES.USERS, me);
  partner.status = "IN_ROUND";
  await put(STORES.USERS, partner);

  return { round: roundView(round, partner) };
}

async function choice(me: LocalUser, roundId: string, body: Body): Promise<{ matched: boolean; pending?: boolean; connectionId?: string }> {
  const round = await getById<LocalRound>(STORES.ROUNDS, roundId);
  if (!round || (round.userAId !== me.id && round.userBId !== me.id)) err(404, "Ronda no encontrada");

  const choiceValue = String(body?.choice ?? "");
  if (!["WANT_MORE", "GOOD_VIBES", "NEXT"].includes(choiceValue)) err(400, "Elección inválida");

  const isA = round.userAId === me.id;
  const partnerId = isA ? round.userBId : round.userAId;
  const partner = await getById<LocalUser>(STORES.USERS, partnerId);
  if (!partner) err(404, "Ronda no encontrada");
  if ((isA && round.choiceA) || (!isA && round.choiceB)) err(409, "Ya registramos tu elección");

  if (isA) round.choiceA = choiceValue;
  else round.choiceB = choiceValue;

  // Simulación determinista de la persona demo (documentada en el backend real)
  if (partner.isDemo) {
    if (choiceValue === "WANT_MORE" || choiceValue === "GOOD_VIBES") {
      if (isA) round.choiceB = choiceValue;
      else round.choiceA = choiceValue;
    }
  }
  await put(STORES.ROUNDS, round);

  if (!round.choiceA || !round.choiceB) return { matched: false, waiting: true };

  const matched = round.choiceA === "WANT_MORE" && round.choiceB === "WANT_MORE";
  const pending =
    !matched &&
    ((round.choiceA === "WANT_MORE" && round.choiceB === "GOOD_VIBES") ||
      (round.choiceA === "GOOD_VIBES" && round.choiceB === "WANT_MORE"));

  if (matched) {
    let connection: LocalConnection | undefined;
    for (const c of await getAll<LocalConnection>(STORES.CONNECTIONS)) {
      const pair =
        (c.userAId === round.userAId && c.userBId === round.userBId) ||
        (c.userAId === round.userBId && c.userBId === round.userAId);
      if (pair && c.status === "ACTIVE") { connection = c; break; }
    }
    if (!connection) {
      connection = {
        id: uid(), userAId: round.userAId, userBId: round.userBId,
        roundId: round.id, status: "ACTIVE", createdAt: nowIso(),
      };
      await put(STORES.CONNECTIONS, connection);
      await put<LocalMessage>(STORES.MESSAGES, {
        id: uid(), connectionId: connection.id, senderId: partnerId,
        content: welcomeFor(partner.name), createdAt: nowIso(),
      });
    }
    for (const uid2 of [me.id, partnerId]) {
      const u = await getById<LocalUser>(STORES.USERS, uid2);
      if (u) { u.status = "CONNECTED"; await put(STORES.USERS, u); }
    }
    return { matched: true, connectionId: connection.id };
  }

  if (pending) {
    const exists = (await getAll<LocalConnection>(STORES.CONNECTIONS))
      .some((c) => c.status === "PENDING" && c.roundId === round.id);
    if (!exists) {
      await put<LocalConnection>(STORES.CONNECTIONS, {
        id: uid(), userAId: round.userAId, userBId: round.userBId,
        roundId: round.id, status: "PENDING", createdAt: nowIso(),
      });
    }
  }

  for (const uid2 of [me.id, partnerId]) {
    const u = await getById<LocalUser>(STORES.USERS, uid2);
    if (u) { u.status = "AVAILABLE"; await put(STORES.USERS, u); }
  }

  return { matched: false, pending };
}

async function connectionsList(me: LocalUser): Promise<{ connections: ConnectionInfo[]; pending: ConnectionInfo[] }> {
  const all = await getAll<LocalConnection>(STORES.CONNECTIONS);
  const mine = all
    .filter((c) => (c.userAId === me.id || c.userBId === me.id) && ["ACTIVE", "PENDING"].includes(c.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const list: ConnectionInfo[] = [];
  for (const c of mine) {
    const partnerId = c.userAId === me.id ? c.userBId : c.userAId;
    const partner = await getById<LocalUser>(STORES.USERS, partnerId);
    if (!partner) continue;
    const msgs = (await getAll<LocalMessage>(STORES.MESSAGES))
      .filter((x) => x.connectionId === c.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const last = msgs[0];
    list.push({
      id: c.id,
      status: c.status,
      createdAt: c.createdAt,
      partner: toPublicUser(partner),
      lastMessage: last ? { content: last.content, createdAt: last.createdAt, mine: last.senderId === me.id } : null,
    });
  }

  return {
    connections: list.filter((c) => c.status === "ACTIVE"),
    pending: list.filter((c) => c.status === "PENDING"),
  };
}

async function messagesList(me: LocalUser, conn: LocalConnection, after: string | null): Promise<{ messages: ChatMessage[] }> {
  const msgs = (await getAll<LocalMessage>(STORES.MESSAGES))
    .filter((x) => x.connectionId === conn.id)
    .filter((x) => (after ? x.createdAt > after : true))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 200);
  return {
    messages: msgs.map((x) => ({ id: x.id, content: x.content, createdAt: x.createdAt, mine: x.senderId === me.id })),
  };
}

async function messageSend(me: LocalUser, conn: LocalConnection, body: Body): Promise<{ message: ChatMessage }> {
  if (conn.status !== "ACTIVE") err(403, "Esta conversación no está activa");
  const content = String(body?.content ?? "").trim();
  if (!content) err(400, "Mensaje vacío");
  if (content.length > 1000) err(400, "Mensaje demasiado largo");
  const message: LocalMessage = {
    id: uid(), connectionId: conn.id, senderId: me.id, content, createdAt: nowIso(),
  };
  await put(STORES.MESSAGES, message);
  return { message: { id: message.id, content, createdAt: message.createdAt, mine: true } };
}

async function eventsList(me: LocalUser): Promise<{ events: EventInfo[] }> {
  const attendees = await getAll<LocalAttendee>(STORES.ATTENDEES);
  const events = DEMO_EVENTS.map((e) => {
    const count = attendees.filter((a) => a.eventId === e.id).length;
    return {
      id: e.id, slug: e.slug, title: e.title, emoji: e.emoji,
      description: e.description, dateLabel: e.dateLabel,
      capacity: e.capacity, attendees: count,
      spotsLeft: Math.max(0, e.capacity - count),
      joined: attendees.some((a) => a.eventId === e.id && a.userId === me.id),
    };
  });
  return { events };
}

async function adminStats(): Promise<AdminStats> {
  const users = await getAll<LocalUser>(STORES.USERS);
  const rounds = (await getAll<LocalRound>(STORES.ROUNDS)).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 50);
  const connections = await getAll<LocalConnection>(STORES.CONNECTIONS);
  const reports = (await getAll<LocalReport>(STORES.REPORTS)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);

  const statusCounts: Record<string, number> = {};
  for (const u of users) statusCounts[u.status] = (statusCounts[u.status] ?? 0) + 1;
  const nameOf = new Map(users.map((u) => [u.id, u.name]));

  return {
    users: {
      total: users.length,
      real: users.filter((u) => !u.isDemo).length,
      demo: users.filter((u) => u.isDemo).length,
    },
    statusCounts,
    activeRounds: rounds.filter((r) => r.status === "ACTIVE").length,
    completedRounds: rounds.filter((r) => r.status === "COMPLETED").length,
    connections: connections.filter((c) => c.status === "ACTIVE").length,
    pendingConnections: connections.filter((c) => c.status === "PENDING").length,
    openReports: reports.filter((r) => r.status === "OPEN").length,
    usersList: users.map((u) => ({ ...toPublicUser(u), email: u.email })),
    roundsList: rounds.map((r) => ({
      id: r.id,
      status: r.status,
      startedAt: r.startedAt,
      userA: nameOf.get(r.userAId) ?? "—",
      userB: nameOf.get(r.userBId) ?? "—",
    })),
    reportsList: reports.map((r) => ({
      id: r.id, reason: r.reason, details: r.details, status: r.status,
      createdAt: r.createdAt, reporter: nameOf.get(r.reporterId) ?? "—", reported: nameOf.get(r.reportedId) ?? "—",
    })),
  };
}

/** Reset total de la base local (uso de diagnóstico). */
export async function resetLocalDb(): Promise<void> {
  await clearStore(STORES.USERS);
  await clearStore(STORES.ROUNDS);
  await clearStore(STORES.CONNECTIONS);
  await clearStore(STORES.MESSAGES);
  await clearStore(STORES.ATTENDEES);
  await clearStore(STORES.REPORTS);
  await clearStore(STORES.BLOCKS);
  await kvSet(SESSION_KEY, null);
  await kvSet(SEED_KEY, false);
}
