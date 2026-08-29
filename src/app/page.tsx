"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Timer, Users, HeartHandshake, ChevronDown, ShieldCheck, Video, Sparkles } from "lucide-react";
import { RondaMark } from "@/components/shell/app-shell";
import { apiGet } from "@/lib/client";
import { assetUrl } from "@/lib/assets";
import type { LiveStatus } from "@/lib/types";

const STEPS = [
  {
    n: "01",
    title: "Presentate",
    text: "Grabá un video de 30 segundos. Sin filtros perfectos: vos, hablando como hablás.",
    icon: Camera,
  },
  {
    n: "02",
    title: "Entrá a una ronda",
    text: "La plataforma te conecta con otra persona disponible en este momento.",
    icon: Users,
  },
  {
    n: "03",
    title: "Hablá durante 5 minutos",
    text: "Videollamada con preguntas para romper el hielo. El tiempo justo para saber si hay química.",
    icon: Timer,
  },
  {
    n: "04",
    title: "Decidan",
    text: "Si los dos quieren volver a hablar, hay conexión. Ahí aparece el chat.",
    icon: HeartHandshake,
  },
];

export default function Landing() {
  const [live, setLive] = useState<LiveStatus | null>(null);

  useEffect(() => {
    const load = () => apiGet<LiveStatus>("/api/stats").then(setLive).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip grain">
      <div className="ambient-glow" aria-hidden="true" />

      <div className="relative z-10">
        {/* Nav */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <RondaMark size={32} />
            <span className="font-display text-lg font-bold tracking-[0.22em]">RONDA</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/terminos"
              className="hidden sm:inline-block text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Términos
            </Link>
            <Link
              href="/privacidad"
              className="hidden sm:inline-block text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacidad
            </Link>
            <Link
              href="/registro"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Crear perfil
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pt-14 sm:pt-24 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border glass px-4 py-1.5 text-xs text-muted-foreground">
              <span className="live-dot" aria-hidden="true" />
              {live ? `${live.connected} personas conectadas ahora` : "Conectando…"}
              <span className="mx-1 text-border">·</span>
              Solo +18
            </div>

            <h1 className="font-display text-[2.6rem] leading-[1.06] font-bold sm:text-6xl lg:text-7xl tracking-tight text-balance">
              30 segundos para presentarte.
              <br />
              <span className="text-warm-gradient">5 minutos</span> para conocerte.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground text-balance">
              Dejá de deslizar perfiles. Empezá a conocer personas.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/registro"
                className="btn-ronda w-full max-w-sm sm:w-auto text-center tracking-wide shadow-[0_8px_40px_rgba(240,180,41,0.25)]"
              >
                QUIERO CONOCER A ALGUIEN
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#como-funciona" className="btn-ghost w-full max-w-sm sm:w-auto text-center">
                ¿CÓMO FUNCIONA?
              </a>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Gratis durante el MVP · Sin descargas · Directo desde el navegador
            </p>
          </motion.div>

          {/* Marco de video ilustrativo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
            className="relative mx-auto mt-16 max-w-3xl"
          >
            <div className="glass rounded-[2rem] p-3 shadow-2xl shadow-black/40">
              <div className="relative overflow-hidden rounded-[1.6rem] bg-surface-2 aspect-[16/10]">
                <video
                  src={assetUrl("/demo-videos/valentina.mp4")}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover opacity-90"
                  aria-label="Ejemplo de presentación en video"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
                  <span className="live-dot" aria-hidden="true" /> EN VIVO
                </div>
                <div className="absolute top-4 right-4 rounded-full glass px-3 py-1.5 font-mono text-xs">
                  04:37
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold">Valentina, 39</p>
                    <p className="text-xs text-muted-foreground">Ciudad de la Costa · en una ronda</p>
                  </div>
                  <div className="flex items-end gap-[3px] h-5" aria-hidden="true">
                    {[0.5, 0.9, 0.6, 1, 0.4, 0.8, 0.55].map((d, i) => (
                      <span
                        key={i}
                        className="eq-bar w-[3px] rounded-full bg-primary/90"
                        style={{ height: "100%", animationDelay: `${i * 0.12}s`, animationDuration: `${0.7 + d * 0.5}s` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 h-16 w-12 overflow-hidden rounded-xl border border-white/20 bg-surface shadow-lg sm:h-20 sm:w-16">
                  <div className="h-full w-full bg-gradient-to-br from-surface-2 to-card flex items-center justify-center">
                    <Video className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -inset-x-8 -top-8 -bottom-8 -z-10 rounded-[3rem] bg-primary/5 blur-2xl" aria-hidden="true" />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
            <a href="#como-funciona" className="mt-14 inline-flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cómo funciona
              <ChevronDown className="h-4 w-4 animate-bounce" />
            </a>
          </motion.div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-20 scroll-mt-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.3em] text-primary mb-3">CÓMO FUNCIONA</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-balance">
              Cuatro pasos. Cero deslizamientos.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ n, title, text, icon: Icon }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass rounded-3xl p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="font-display text-3xl font-bold text-primary/35">{n}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon size={19} />
                  </div>
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Rompehielos teaser */}
        <section className="mx-auto max-w-6xl px-5 py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-3xl p-8 sm:p-10 text-center"
          >
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose/15 text-rose">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3 text-balance">
              Nunca más “hola, ¿cómo estás?”
            </h2>
            <p className="mx-auto max-w-lg text-muted-foreground mb-8">
              Durante cada ronda aparecen preguntas para romper el hielo. Las que sí hacen hablar.
            </p>
            <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
              {[
                "¿Qué canción pondrías ahora mismo si nadie pudiera juzgarte?",
                "¿Cuál fue la última cosa que te hizo reír de verdad?",
                "Si mañana pudieras viajar gratis a cualquier lugar, ¿dónde irías?",
                "¿Qué cosa pequeña te hace feliz?",
              ].map((q) => (
                <div key={q} className="rounded-2xl border border-border bg-surface/60 px-5 py-4 text-left text-sm text-foreground/90">
                  “{q}”
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Manifiesto */}
        <section className="mx-auto max-w-6xl px-5 py-24 text-center">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="font-display mx-auto max-w-3xl text-3xl sm:text-5xl font-bold leading-tight text-balance"
          >
            “No venimos a buscar perfiles.
            <br />
            <span className="text-warm-gradient">Venimos a conocer personas.”</span>
          </motion.p>
          <div className="mt-12">
            <Link href="/registro" className="btn-ronda inline-flex shadow-[0_8px_40px_rgba(240,180,41,0.25)]">
              EMPEZAR MI PRIMERA RONDA
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RondaMark size={20} />
              RONDA — conocer personas, no perfiles
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Exclusivo +18
              </span>
              <Link href="/terminos" className="hover:text-foreground transition-colors">Términos</Link>
              <Link href="/privacidad" className="hover:text-foreground transition-colors">Privacidad</Link>
              <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
