import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_PIN } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pin = String(body?.pin ?? "");

  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 horas
  });
  return NextResponse.json({ ok: true });
}
