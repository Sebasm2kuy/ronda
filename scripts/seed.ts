// Seed de datos demo para RONDA MVP
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEMO_USERS = [
  {
    name: "Sofía", age: 38, city: "Montevideo", gender: "FEMALE", preference: "MEN",
    lookingFor: "RELATIONSHIP", photo: "/avatars/sofia.jpg", video: "/demo-videos/sofia.mp4",
    bio: "Arquitecta, mamá de un perro enorme. Me gusta cocinar para mucha gente y las conversaciones largas con vino.",
    interests: ["Cocina", "Arquitectura", "Vino", "Perros"],
    status: "AVAILABLE",
  },
  {
    name: "Martina", age: 41, city: "Canelones", gender: "FEMALE", preference: "MEN",
    lookingFor: "MEET_PEOPLE", photo: "/avatars/martina.jpg", video: "/demo-videos/martina.mp4",
    bio: "Profesora de yoga. Corrí dos maratones, ninguna rápido. Fan del mate dulce y de las historias de viajeros.",
    interests: ["Yoga", "Running", "Mate", "Viajes"],
    status: "AVAILABLE",
  },
  {
    name: "Carolina", age: 36, city: "Montevideo", gender: "FEMALE", preference: "EVERYONE",
    lookingFor: "FRIENDSHIP", photo: "/avatars/carolina.jpg", video: "/demo-videos/carolina.mp4",
    bio: "Fotógrata. Siempre con una cámara encima y planes de último minuto. Busco buena charla y gente curiosa.",
    interests: ["Fotografía", "Cine", "Arte", "Café de especialidad"],
    status: "AVAILABLE",
  },
  {
    name: "Lucía", age: 43, city: "Montevideo", gender: "FEMALE", preference: "MEN",
    lookingFor: "RELATIONSHIP", photo: "/avatars/lucia.jpg", video: "/demo-videos/lucia.mp4",
    bio: "Médica pediatra. Aprendí a surfear a los 40. Creo que las mejores conversaciones empiezan sin guion.",
    interests: ["Surf", "Lectura", "Mar", "Música en vivo"],
    status: "AVAILABLE",
  },
  {
    name: "Valentina", age: 39, city: "Ciudad de la Costa", gender: "FEMALE", preference: "EVERYONE",
    lookingFor: "MEET_PEOPLE", photo: "/avatars/valentina.jpg", video: "/demo-videos/valentina.mp4",
    bio: "Diseñadora y risa fácil. Me presento con 30 segundos y me sobran. Cero small talk, por favor.",
    interests: ["Diseño", "Risa", "Plantas", "Podcasts"],
    status: "AVAILABLE",
  },
  {
    name: "Diego", age: 40, city: "Montevideo", gender: "MALE", preference: "WOMEN",
    lookingFor: "RELATIONSHIP", photo: "/avatars/diego.jpg", video: "/demo-videos/diego.mp4",
    bio: "Chef. Cocino para vivir y vivo para cocinar. Mis amigos dicen que soy el mejor oyente del mundo.",
    interests: ["Cocina", "Cerveza artesanal", "Fútbol", "Vinilos"],
    status: "AVAILABLE",
  },
  {
    name: "Andrés", age: 37, city: "Maldonado", gender: "MALE", preference: "WOMEN",
    lookingFor: "MEET_PEOPLE", photo: "/avatars/andres.jpg", video: "/demo-videos/andres.mp4",
    bio: "Ingeniero y deportista. Vengo a Punta del Este cada fin de mes. Detesto los juegos de mente, amo los de mesa.",
    interests: ["Deportes", "Tecnología", "Juegos de mesa", "Playa"],
    status: "AVAILABLE",
  },
  {
    name: "Rodrigo", age: 34, city: "Montevideo", gender: "MALE", preference: "WOMEN",
    lookingFor: "RELATIONSHIP", photo: "/avatars/rodrigo.jpg", video: "/demo-videos/rodrigo.mp4",
    bio: "Músico de noche, programador de día. Toco en una banda de rock desde los 20. Preguntame por conciertos.",
    interests: ["Rock", "Guitarra", "Programación", "Conciertos"],
    status: "AVAILABLE",
  },
  {
    name: "Martín", age: 48, city: "Montevideo", gender: "MALE", preference: "WOMEN",
    lookingFor: "FRIENDSHIP", photo: "/avatars/martin.jpg", video: "/demo-videos/martin.mp4",
    bio: "Emprendedor de café. Recorro el país buscando el grano perfecto. Buena charla sobre cualquier tema.",
    interests: ["Café", "Emprender", "Cicloturismo", "Historia"],
    status: "AVAILABLE",
  },
  {
    name: "Federico", age: 33, city: "Montevideo", gender: "MALE", preference: "EVERYONE",
    lookingFor: "MEET_PEOPLE", photo: "/avatars/federico.jpg", video: "/demo-videos/federico.mp4",
    bio: "Contador que hace teatro para desestructurarse. Conozco todos los cafecitos de la Ciudad Vieja.",
    interests: ["Teatro", "Finanzas", "Cafeterías", "Stand up"],
    status: "AVAILABLE",
  },
];

const EVENTS = [
  {
    slug: "viernes-ronda",
    title: "Viernes de Ronda",
    emoji: "🔥",
    description: "La ronda clásica: 20 personas, rondas de 5 minutos, cero presiones. La forma perfecta de arrancar el fin de semana.",
    dateLabel: "Viernes 21:00",
    capacity: 20,
  },
  {
    slug: "noche-rock",
    title: "Noche Rock",
    emoji: "🎸",
    description: "Para los que se conocieron en un recital (o quisieron). Rondas con soundtrack de guitarras y clásicos del rock rioplatense.",
    dateLabel: "Sábado 22:00",
    capacity: 30,
  },
  {
    slug: "mate-charla",
    title: "Mate & Charla",
    emoji: "🧉",
    description: "Rondas relajadas de domingo con la termosera lista. Sin apuro, sin presión, con la mejor onda del mundo.",
    dateLabel: "Domingo 20:00",
    capacity: 15,
  },
  {
    slug: "mayores-35",
    title: "Mayores de 35",
    emoji: "❤️",
    description: "Rondas para gente que sabe lo que quiere. Conversaciones de verdad, sin vueltas y con madurez.",
    dateLabel: "Jueves 20:30",
    capacity: 25,
  },
];

const ICEBREAKERS = [
  "¿Qué canción pondrías ahora mismo si nadie pudiera juzgarte?",
  "¿Cuál fue la última cosa que te hizo reír de verdad?",
  "Si mañana pudieras viajar gratis a cualquier lugar, ¿dónde irías?",
  "¿Qué cosa pequeña te hace feliz?",
  "¿Qué te atrapó de tu última obsesión (serie, hobby, comida)?",
  "Si tuvieras un día libre perfecto, ¿cómo lo pasarías?",
  "¿Cuál es el mejor consejo que te dio alguien de tu familia?",
  "¿Qué comida te transporta directo a tu infancia?",
  "Si pudieras tener una habilidad instantánea, ¿cuál elegirías?",
  "¿Qué plan simple nunca falla para un sábado a la noche?",
  "¿Cuál fue tu peor corte de pelo de toda tu vida?",
  "¿A qué le dedicás tiempo ahora que antes no imaginabas?",
];

const WELCOME_MESSAGES: Record<string, string> = {
  Sofía: "¡Qué lindo conocerte! Me encantó nuestra ronda 🙌 ¿tomamos un café cuando puedas?",
  Martina: "¡Hola! Qué buena onda la tuya. Cuando quieras seguimos la charla con unos mates 🧉",
  Carolina: "¡Hola hola! Me re gustó charlar contigo. Te dejo mi lado fotógrafo a disposición 😄",
  Lucía: "¡Hola! Qué bueno que los dos queramos seguir hablando. Contame cómo sigue tu semana",
  Valentina: "¡Hay conexión! 😃 Jajá me encantó la ronda. Seguimos por acá tranquilo",
  Diego: "¡Buenísimo! Si te gusta comer rico, estamos en la misma página. Seguimos charlando 👨‍🍳",
  Andrés: "¡Hola! La ronda voló, señal de que la charla fluyó. Sigamos por acá",
  Rodrigo: "¡Hola! La charla estuvo buenísima. Te debo una playlist a medida 🎸",
  Martín: "¡Qué gusto! Cuando quieras te preparo el mejor café de Montevideo ☕",
  Federico: "¡Hola! Me haste reír más que el stand up del jueves. Seguimos la charla 🎭",
};

async function main() {
  console.log("🌱 Seeding RONDA…");

  // Limpiar
  await db.icebreaker.deleteMany();
  await db.report.deleteMany();
  await db.block.deleteMany();
  await db.message.deleteMany();
  await db.connection.deleteMany();
  await db.round.deleteMany();
  await db.eventAttendee.deleteMany();
  await db.event.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany({ where: { isDemo: true } });

  // Usuarios demo
  for (const u of DEMO_USERS) {
    const slug = u.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    await db.user.create({
      data: {
        email: `${slug}@demo.ronda.uy`,
        name: u.name,
        age: u.age,
        city: u.city,
        gender: u.gender,
        lookingFor: u.lookingFor,
        preference: u.preference,
        interests: JSON.stringify(u.interests),
        bio: u.bio,
        photoUrl: u.photo,
        videoUrl: u.video,
        status: u.status,
        isDemo: true,
        provider: "demo",
      },
    });
  }
  console.log(`  ✓ ${DEMO_USERS.length} usuarios demo`);

  // Eventos
  for (const e of EVENTS) {
    await db.event.create({ data: e });
  }
  console.log(`  ✓ ${EVENTS.length} eventos`);

  // Icebreakers
  for (let i = 0; i < ICEBREAKERS.length; i++) {
    await db.icebreaker.create({ data: { text: ICEBREAKERS[i], order: i } });
  }
  console.log(`  ✓ ${ICEBREAKERS.length} rompehielos`);

  // Estados variados para el admin: 1 esperando, 2 en ronda (ronda activa demo)
  const martina = await db.user.findUnique({ where: { email: "martina@demo.ronda.uy" } });
  const federico = await db.user.findUnique({ where: { email: "federico@demo.ronda.uy" } });
  if (martina && federico) {
    await db.round.create({
      data: { userAId: martina.id, userBId: federico.id, status: "ACTIVE" },
    });
    await db.user.update({ where: { id: martina.id }, data: { status: "IN_ROUND" } });
    await db.user.update({ where: { id: federico.id }, data: { status: "IN_ROUND" } });
    console.log("  ✓ ronda demo activa (Martina ↔ Federico)");
  }

  console.log("🌱 Seed completo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
