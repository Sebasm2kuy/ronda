import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Términos y condiciones — RONDA" };

const SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: "1. Sobre RONDA",
    body: [
      "RONDA es una plataforma de encuentros sociales cuyo formato se basa en presentaciones en video de 30 segundos y rondas de videollamada de 5 minutos. Nuestro principio fundamental es que las personas se conozcan de verdad, no a través de perfiles estáticos ni sistemas de deslizamiento.",
      "Al crear un perfil aceptás estas reglas y nuestro modelo de interacción: el contacto entre personas solo es posible después de una ronda con match mutuo. Nadie puede contactarte libremente sin pasar por el sistema de conexión.",
    ],
  },
  {
    title: "2. Edad mínima: 18 años",
    body: [
      "RONDA es exclusivamente para personas mayores de 18 años. El registro exige confirmar la edad, y el uso de la plataforma por parte de menores es una violación grave de estos términos que deriva en el cierre inmediato de la cuenta.",
    ],
  },
  {
    title: "3. Tu presentación en video",
    body: [
      "El video de presentación (30 segundos) se graba directamente desde la plataforma. No se permiten videos subidos, editados ni producidos fuera de RONDA, porque la confianza del formato depende de que la persona sea real y esté presente.",
      "El video solo se muestra dentro de RONDA, a personas registradas, en el contexto de la plataforma.",
    ],
  },
  {
    title: "4. Convivencia y conducta",
    body: [
      "Tratá a las personas como querés ser tratado. Está estrictamente prohibido: acoso o discursos de odio, contenido sexual explícito durante rondas, suplantación de identidad, spam o promoción comercial, y cualquier conducta que ponga en riesgo la seguridad de otra persona.",
      "Las denuncias se revisan con prioridad y pueden derivar en suspensión o eliminación permanente de la cuenta.",
    ],
  },
  {
    title: "5. Cámara, micrófono y rondas",
    body: [
      "Las rondas son videollamadas en vivo. Al entrar a una ronda autorizás el uso de tu cámara y micrófono durante esa llamada. Podés silenciar tu micrófono o apagar tu cámara en cualquier momento, y finalizar la ronda cuando quieras.",
      "Las rondas no se graban por parte de la plataforma en esta versión.",
    ],
  },
  {
    title: "6. Match y chat",
    body: [
      "El chat solo se habilita cuando ambas personas eligen volver a hablar al final de una ronda. Las elecciones individuales permanecen privadas salvo que exista match mutuo.",
    ],
  },
  {
    title: "7. Limitaciones",
    body: [
      "RONDA se ofrece tal cual, en versión de desarrollo (MVP). No garantizamos la disponibilidad continua del servicio ni la cantidad de personas conectadas en cada momento. No somos responsables de las interacciones fuera de la plataforma.",
      "Estos términos pueden actualizarse; avisaremos los cambios relevantes dentro de la aplicación.",
    ],
  },
];

export default function TerminosPage() {
  return (
    <div className="relative min-h-screen grain">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Volver
        </Link>
        <h1 className="mt-6 font-display text-4xl font-bold">Términos y condiciones</h1>
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
