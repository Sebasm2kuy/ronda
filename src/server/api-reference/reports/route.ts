import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const VALID_REASONS = ["INAPPROPRIATE", "HARASSMENT", "FAKE_PROFILE", "OTHER"];

// Denunciar comportamiento inapropiado
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reportedId = String(body?.reportedId ?? "");
  const reason = String(body?.reason ?? "");
  const details = typeof body?.details === "string" ? body.details.slice(0, 500) : null;

  if (!reportedId || !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Datos de denuncia incompletos" }, { status: 400 });
  }
  const reported = await db.user.findUnique({ where: { id: reportedId } });
  if (!reported) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const report = await db.report.create({
    data: { reporterId: user.id, reportedId, reason, details },
  });

  return NextResponse.json({ ok: true, reportId: report.id });
}
