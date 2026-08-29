import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidad — RONDA" };

const SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: "Qué datos pedimos (y por qué)",
    body: [
      "Para crear tu perfil pedimos lo mínimo: nombre, edad, ciudad, género, qué buscás, tus preferencias, intereses y una foto. Nada más. No pedimos número de teléfono, dirección ni redes sociales.",
      "Tu presentación en video es parte de tu perfil porque es la base del formato RONDA: presentate vos, en 30 segundos.",
    ],
  },
  {
    title: "Cámara y micrófono",
    body: [
      "Pedimos acceso a tu cámara y micrófono solo en dos momentos: cuando grabás tu presentación y cuando entrás a una ronda. Podés negar el permiso, y siempre podés silenciar el micrófono o apagar la cámara durante una llamada.",
      "Las rondas en vivo no son grabadas por la plataforma en esta versión (MVP).",
    ],
  },
  {
    title: "Quién puede ver tu perfil",
    body: [
      "Tu perfil (incluido el video) solo es visible para personas registradas dentro de RONDA. No vendemos ni compartimos tus datos con terceros con fines publicitarios.",
      "El contacto entre personas solo existe si hay un match mutuo después de una ronda.",
    ],
  },
  {
    title: "Bloqueos y reportes",
    body: [
      "Podés reportar y bloquear a cualquier persona en cualquier momento desde una ronda o el chat. Los reportes son revisados por el equipo de moderación y se guardan de forma confidencial.",
      "Cuando bloqueás a alguien, esa persona no puede volver a coincidir contigo ni contactarte.",
    ],
  },
  {
    title: "Tus datos, tus decisiones",
    body: [
      "Podés cerrar tu sesión en cualquier momento. Para solicitar la eliminación completa de tu perfil y tus contenidos, escribinos desde el canal de contacto de la plataforma y la procesaremos.",
      "En el MVP los datos se almacenan en servidores propios cifrados en tránsito. En versiones productivas sumaremos cifrado adicional y residencia de datos en la región.",
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <div className="relative min-h-screen grain">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Volver
        </Link>
        <h1 className="mt-6 font-display text-4xl font-bold">Política de privacidad</h1>
        <p className="mt-2 text-sm text-muted-foreground">Versión MVP · Última actualización: agosto 2026</p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-xl font-bold mb-3">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mb-3 text-[15px] leading-relaxed text-foreground/85">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
