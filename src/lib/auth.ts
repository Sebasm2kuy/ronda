// Autenticación por sesión (cookie httpOnly + tabla Session)
// El MVP no usa OAuth real: "Continuar con Google/TikTok" es solo visual.

import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { User } from "@prisma/client";
import type { PublicUser } from "@/lib/types";
import { parseInterests } from "@/lib/constants";

export const SESSION_COOKIE = "ronda_session";
export const ADMIN_COOKIE = "ronda_admin";
export const ADMIN_PIN = process.env.ADMIN_PIN ?? "ronda2026";

export function newToken(): string {
  return randomBytes(24).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = newToken();
  await db.session.create({ data: { token, userId } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { token }, include: { user: true } });
  return session?.user ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === "1";
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    name: u.name,
    age: u.age,
    city: u.city,
    gender: u.gender,
    lookingFor: u.lookingFor,
    preference: u.preference,
    interests: parseInterests(u.interests),
    bio: u.bio,
    photoUrl: u.photoUrl,
    videoUrl: u.videoUrl,
    status: u.status,
    isDemo: u.isDemo,
    provider: u.provider,
    createdAt: u.createdAt.toISOString(),
  };
}
