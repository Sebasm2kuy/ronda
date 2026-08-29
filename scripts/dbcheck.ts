// Inspección rápida de la base de datos para debugging
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const conns = await db.connection.findMany();
  console.log("CONNECTIONS:", conns.map((c) => ({ id: c.id, a: c.userAId.slice(-6), b: c.userBId.slice(-6), status: c.status, round: c.roundId?.slice(-6) })));
  const rounds = await db.round.findMany({ orderBy: { createdAt: "desc" }, take: 4 });
  console.log("ROUNDS:", rounds.map((r) => ({ id: r.id.slice(-6), status: r.status, choiceA: r.choiceA, choiceB: r.choiceB })));
  const users = await db.user.findMany({ where: { isDemo: false } });
  console.log("REAL USERS:", users.map((u) => ({ name: u.name, status: u.status })));
  const msgs = await db.message.findMany({ take: 5, orderBy: { createdAt: "asc" } });
  console.log("MESSAGES:", msgs.map((m) => ({ id: m.id.slice(-6), conn: m.connectionId.slice(-6), sender: m.senderId.slice(-6), content: m.content.slice(0, 30) })));
  await db.$disconnect();
}

main();
