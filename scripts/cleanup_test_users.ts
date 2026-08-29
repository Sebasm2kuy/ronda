// Limpia usuarios de prueba reales (no demo) y sus datos asociados.
// Mantiene: usuarios demo, eventos, icebreakers, ronda demo del admin.
import { PrismaClient } from "@prisma/client";
import { readdirSync, unlinkSync, existsSync } from "fs";
import path from "path";

const db = new PrismaClient();
const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

async function main() {
  const realUsers = await db.user.findMany({ where: { isDemo: false } });
  console.log("Usuarios reales a eliminar:", realUsers.map((u) => u.name));
  const realIds = realUsers.map((u) => u.id);

  // 1. Mensajes de conexiones que involucran usuarios reales
  const connsToDelete = await db.connection.findMany({
    where: { OR: [{ userAId: { in: realIds } }, { userBId: { in: realIds } }] },
  });
  for (const c of connsToDelete) {
    await db.message.deleteMany({ where: { connectionId: c.id } });
    await db.connection.delete({ where: { id: c.id } });
  }

  // 2. Rondas con usuarios reales
  await db.round.deleteMany({
    where: { OR: [{ userAId: { in: realIds } }, { userBId: { in: realIds } }] },
  });

  // 3. Sesiones, bloques, reportes, asistencias a eventos (cascada desde Session/Block sí existe,
  //    pero borramos explícito por claridad)
  await db.session.deleteMany({ where: { userId: { in: realIds } } });
  await db.block.deleteMany({ where: { OR: [{ blockerId: { in: realIds } }, { blockedId: { in: realIds } }] } });
  await db.report.deleteMany({ where: { OR: [{ reporterId: { in: realIds } }, { reportedId: { in: realIds } }] } });
  await db.eventAttendee.deleteMany({ where: { userId: { in: realIds } } });

  // 4. Usuarios reales
  for (const u of realUsers) {
    await db.user.delete({ where: { id: u.id } });
  }

  // Limpia conexiones/rondas que involucraban a los usuarios reales (no hay cascade en FK cruzadas de Connection/Round)
  const orphanRounds = await db.round.findMany();
  for (const r of orphanRounds) {
    const a = await db.user.findUnique({ where: { id: r.userAId } });
    const b = await db.user.findUnique({ where: { id: r.userBId } });
    if (!a || !b) await db.round.delete({ where: { id: r.id } });
  }
  const orphanConns = await db.connection.findMany();
  for (const c of orphanConns) {
    const a = await db.user.findUnique({ where: { id: c.userAId } });
    const b = await db.user.findUnique({ where: { id: c.userBId } });
    if (!a || !b) await db.connection.delete({ where: { id: c.id } });
  }

  // Restaura estados demo
  await db.user.updateMany({ where: { isDemo: true, status: { in: ["CONNECTED", "ROUND_ENDED"] } }, data: { status: "AVAILABLE" } });
  // La ronda demo activa (Martina ↔ Federico) sigue existiendo con sus estados IN_ROUND

  // Borra archivos subidos por usuarios de prueba
  for (const kind of ["photos", "videos"]) {
    const dir = path.join(UPLOAD_ROOT, kind);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      unlinkSync(path.join(dir, f));
    }
  }

  const remaining = await db.user.findMany();
  console.log("Restantes:", remaining.length, "usuarios (todos demo:", remaining.every((u) => u.isDemo), ")");
  const msgs = await db.message.findMany();
  console.log("Mensajes restantes:", msgs.length);
  const conns = await db.connection.findMany();
  console.log("Conexiones restantes:", conns.length);
  await db.$disconnect();
}

main();
