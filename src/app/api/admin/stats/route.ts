import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { toPublicUser } from "@/lib/auth";
import type { AdminStats } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } });
  const rounds = await db.round.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  const connections = await db.connection.findMany();
  const reports = await db.report.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  const statusCounts: Record<string, number> = {};
  for (const u of users) statusCounts[u.status] = (statusCounts[u.status] ?? 0) + 1;

  const nameOf = new Map(users.map((u) => [u.id, u.name]));

  const stats: AdminStats = {
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
      startedAt: r.startedAt.toISOString(),
      userA: nameOf.get(r.userAId) ?? "—",
      userB: nameOf.get(r.userBId) ?? "—",
    })),
    reportsList: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reporter: nameOf.get(r.reporterId) ?? "—",
      reported: nameOf.get(r.reportedId) ?? "—",
    })),
  };

  return NextResponse.json(stats);
}
