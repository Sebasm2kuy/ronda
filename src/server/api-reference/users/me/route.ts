import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, toPublicUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return NextResponse.json({ user: toPublicUser(user) });
}

// Actualización de perfil: foto, video, bio, intereses
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, string> = {};

  if (typeof body.photoUrl === "string" && (body.photoUrl.startsWith("/api/media/photos/") || body.photoUrl.startsWith("/avatars/"))) {
    data.photoUrl = body.photoUrl;
  }
  if (typeof body.videoUrl === "string" && (body.videoUrl.startsWith("/api/media/videos/") || body.videoUrl.startsWith("/demo-videos/"))) {
    data.videoUrl = body.videoUrl;
  }
  if (typeof body.bio === "string") {
    data.bio = body.bio.slice(0, 240);
  }
  if (Array.isArray(body.interests)) {
    data.interests = JSON.stringify(body.interests.filter((i: unknown) => typeof i === "string").slice(0, 12));
  }
  if (typeof body.city === "string" && body.city.trim().length >= 2) {
    data.city = body.city.trim().slice(0, 60);
  }

  const updated = await db.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ user: toPublicUser(updated) });
}
