// Datos demo de RONDA (port del seed del backend).
// En el MVP estático estos usuarios "viven" en el navegador:
// permiten probar todo el flujo sin usuarios reales.

import { assetUrl } from "@/lib/assets";

export interface DemoUserSeed {
  id: string;
  name: string;
  age: number;
  city: string;
  gender: string;
  preference: string;
  lookingFor: string;
  interests: string[];
  bio: string;
  photoUrl: string;
  videoUrl: string;
  status: string;
}

export const DEMO_USERS: DemoUserSeed[] = [
  {
    id: "demo-sofia",
    name: "Sofía", age: 38, city: "Montevideo", gender: "FEMALE", preference: "MEN",
    lookingFor: "RELATIONSHIP", photoUrl: assetUrl("/avatars/sofia.jpg"), videoUrl: assetUrl("/demo-videos/sofia.mp4"),
    bio: "Arquitecta, mamá de un perro enorme. Me gusta cocinar para mucha gente y las conversaciones largas con vino.",
    interests: ["Cocina", "Arquitectura", "Vino", "Perros"],
    status: "AVAILABLE",
  },
  {
    id: "demo-martina",
    name: "Martina", age: 41, city: "Canelones", gender: "FEMALE", preference: "MEN",
    lookingFor: "MEET_PEOPLE", photoUrl: assetUrl("/avatars/martina.jpg"), videoUrl: assetUrl("/demo-videos/martina.mp4"),
    bio: "Profesora de yoga. Corrí dos maratones, ninguna rápido. Fan del mate dulce y de las historias de viajeros.",
    interests: ["Yoga", "Running", "Mate", "Viajes"],
    status: "AVAILABLE",
  },
  {
    id: "demo-carolina",
    name: "Carolina", age: 36, city: "Montevideo", gender: "FEMALE", preference: "EVERYONE",
    lookingFor: "FRIENDSHIP", photoUrl: assetUrl("/avatars/carolina.jpg"), videoUrl: assetUrl("/demo-videos/carolina.mp4"),
    bio: "Fotógrata. Siempre con una cámara encima y planes de último minuto. Busco buena charla y gente curiosa.",
    interests: ["Fotografía", "Cine", "Arte", "Café de especialidad"],
    status: "AVAILABLE",
  },
  {
    id: "demo-lucia",
    name: "Lucía", age: 43, city: "Montevideo", gender: "FEMALE", preference: "MEN",
    lookingFor: "RELATIONSHIP", photoUrl: assetUrl("/avatars/lucia.jpg"), videoUrl: assetUrl("/demo-videos/lucia.mp4"),
    bio: "Médica pediatra. Aprendí a surfear a los 40. Creo que las mejores conversaciones empiezan sin guion.",
    interests: ["Surf", "Lectura", "Mar", "Música en vivo"],
    status: "AVAILABLE",
  },
  {
    id: "demo-valentina",
    name: "Valentina", age: 39, city: "Ciudad de la Costa", gender: "FEMALE", preference: "EVERYONE",
    lookingFor: "MEET_PEOPLE", photoUrl: assetUrl("/avatars/valentina.jpg"), videoUrl: assetUrl("/demo-videos/valentina.mp4"),
    bio: "Diseñadora y risa fácil. Me presento con 30 segundos y me sobran. Cero small talk, por favor.",
    interests: ["Diseño", "Risa", "Plantas", "Podcasts"],
    status: "AVAILABLE",
  },
  {
    id: "demo-diego",
    name: "Diego", age: 40, city: "Montevideo", gender: "MALE", preference: "WOMEN",
    lookingFor: "RELATIONSHIP", photoUrl: assetUrl("/avatars/diego.jpg"), videoUrl: assetUrl("/demo-videos/diego.mp4"),
    bio: "Chef. Cocino para vivir y vivo para cocinar. Mis amigos dicen que soy el mejor oyente del mundo.",
    interests: ["Cocina", "Cerveza artesanal", "Fútbol", "Vinilos"],
    status: "AVAILABLE",
  },
  {
    id: "demo-andres",
    name: "Andrés", age: 37, city: "Maldonado", gender: "MALE", preference: "WOMEN",
    lookingFor: "MEET_PEOPLE", photoUrl: assetUrl("/avatars/andres.jpg"), videoUrl: assetUrl("/demo-videos/andres.mp4"),
    bio: "Ingeniero y deportista. Vengo a Punta del Este cada fin de mes. Detesto los juegos de mente, amo los de mesa.",
    interests: ["Deportes", "Tecnología", "Juegos de mesa", "Playa"],
    status: "AVAILABLE",
  },
  {
    id: "demo-rodrigo",
    name: "Rodrigo", age: 34, city: "Montevideo", gender: "MALE", preference: "WOMEN",
    lookingFor: "RELATIONSHIP", photoUrl: assetUrl("/avatars/rodrigo.jpg"), videoUrl: assetUrl("/demo-videos/rodrigo.mp4"),
    bio: "Músico de noche, programador de día. Toco en una banda de rock desde los 20. Preguntame por conciertos.",
    interests: ["Rock", "Guitarra", "Programación", "Conciertos"],
    status: "AVAILABLE",
  },
  {
    id: "demo-martin",
    name: "Martín", age: 48, city: "Montevideo", gender: "MALE", preference: "WOMEN",
    lookingFor: "FRIENDSHIP", photoUrl: assetUrl("/avatars/martin.jpg"), videoUrl: assetUrl("/demo-videos/martin.mp4"),
    bio: "Emprendedor de café. Recorro el país buscando el grano perfecto. Buena charla sobre cualquier tema.",
    interests: ["Café", "Emprender", "Cicloturismo", "Historia"],
    status: "AVAILABLE",
  },
  {
    id: "demo-federico",
    name: "Federico", age: 33, city: "Montevideo", gender: "MALE", preference: "EVERYONE",
    lookingFor: "MEET_PEOPLE", photoUrl: assetUrl("/avatars/federico.jpg"), videoUrl: assetUrl("/demo-videos/federico.mp4"),
    bio: "Contador que hace teatro para desestructurarse. Conozco todos los cafecitos de la Ciudad Vieja.",
    interests: ["Teatro", "Finanzas", "Cafeterías", "Stand up"],
    status: "AVAILABLE",
  },
];

export const DEMO_EVENTS = [
  {
    id: "evt-viernes-ronda",
    slug: "viernes-ronda",
    title: "Viernes de Ronda",
    emoji: "🔥",
    description: "La ronda clásica: 20 personas, rondas de 5 minutos, cero presiones. La forma perfecta de arrancar el fin de semana.",
    dateLabel: "Viernes 21:00",
    capacity: 20,
  },
  {
    id: "evt-noche-rock",
    slug: "noche-rock",
    title: "Noche Rock",
    emoji: "🎸",
    description: "Para los que se conocieron en un recital (o quisieron). Rondas con soundtrack de guitarras y clásicos del rock rioplatense.",
    dateLabel: "Sábado 22:00",
    capacity: 30,
  },
  {
    id: "evt-mate-charla",
    slug: "mate-charla",
    title: "Mate & Charla",
    emoji: "🧉",
    description: "Rondas relajadas de domingo con la termosera lista. Sin apuro, sin presión, con la mejor onda del mundo.",
    dateLabel: "Domingo 20:00",
    capacity: 15,
  },
  {
    id: "evt-mayores-35",
    slug: "mayores-35",
    title: "Mayores de 35",
    emoji: "❤️",
    description: "Rondas para gente que sabe lo que quiere. Conversaciones de verdad, sin vueltas y con madurez.",
    dateLabel: "Jueves 20:30",
    capacity: 25,
  },
];

export const ICEBREAKERS = [
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

// La ronda demo activa del seed (Martina ↔ Federico) da vida al panel admin.
export const DEMO_ROUND = { userAId: "demo-martina", userBId: "demo-federico" };
