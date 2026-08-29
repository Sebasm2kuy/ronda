import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { LiveStatus } from "@/lib/types";

export const runtime = "nodejs";

// Estado público de la plataforma (para la landing y la sala de espera).
// Devuelve usuarios "reales" conectados + demo disponibles, con una
// oscilación leve por minuto para que el número se sienta vivo.
export async function GET() {
  const [available, inRound, connected] = await Promise.all([
    db.user.count({ where: { status: "AVAILABLE" } }),
    db.user.count({ where: { status: "IN_ROUND" } }),
    db.user.count({ where: { status: "CONNECTED" } }),
  ]);

  // Jitter determinista por minuto (±2) para no reflejar exactamente el mismo número
  const minuteSeed = Math.floor(Date.now() / 60000) % 5;
  const jitter = minuteSeed - 2;

  const data: LiveStatus = {
    available: Math.max(1, available + jitter),
    inRound: Math.max(0, inRound),
    connected: Math.max(1, available + inRound + connected + jitter),
  };

  return NextResponse.json(data);
}
