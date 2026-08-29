"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Ticket, MessagesSquare, ArrowRight, Camera, Clock, MapPin } from "lucide-react";
import { apiGet } from "@/lib/client";
import type { PublicUser, LiveStatus, ConnectionInfo } from "@/lib/types";
import { labelFor, LOOKING_FOR } from "@/lib/constants";

export default function InicioPage() {
  const router = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [live, setLive] = useState<LiveStatus | null>(null);
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet<{ user: PublicUser | null }>("/api/auth/session"),
      apiGet<LiveStatus>("/api/stats").catch(() => null),
      apiGet<{ connections: ConnectionInfo[] }>("/api/connections").catch(() => ({ connections: [] })),
    ])
      .then(([s, l, c]) => {
        if (!s.user) {
          router.replace("/");
          return;
        }
        setMe(s.user);
        setLive(l);
        setConnections(c.connections);
        setLoaded(true);
      })
      .catch(() => router.replace("/"));
  }, [router]);

  if (!loaded || !me) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      {/* Saludo */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-xs font-semibold tracking-[0.3em] text-primary mb-2">ESTÁS EN LA RONDA</p>
        <h1 className="font-display text-3xl font-bold text-balance">
          Hola, {me.name} 👋
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {me.city}</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Buscás {labelFor(me.lookingFor, LOOKING_FOR).toLowerCase()}</span>
        </p>
      </motion.div>

      {/* CTA principal */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-8 overflow-hidden rounded-[2rem] glass"
      >
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">
              {live ? `${live.available} personas disponibles ahora` : "Buscando personas…"}
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-balance">
            ¿Entramos a una ronda de 5 minutos?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Videollamada con alguien nuevo, preguntas para romper el hielo y cero deslizamientos.
            Si hay química, los dos deciden.
          </p>
          <Link href="/ronda" className="btn-ronda mt-6 w-full shadow-[0_8px_40px_rgba(240,180,41,0.22)]">
            <Flame className="h-5 w-5" /> ENTRAR A LA RONDA
          </Link>
          {!me.videoUrl && (
            <Link
              href="/onboarding/video"
              className="mt-4 flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3 text-sm transition-colors hover:bg-primary/15"
            >
              <span className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                Te falta grabar tu presentación de 30 segundos
              </span>
              <ArrowRight className="h-4 w-4 text-primary" />
            </Link>
          )}
        </div>
      </motion.div>

      {/* Atajos */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Link href="/eventos" className="glass group rounded-3xl p-5 transition-colors hover:border-primary/30">
          <Ticket className="mb-3 h-6 w-6 text-primary" />
          <p className="font-display font-semibold">Eventos</p>
          <p className="mt-1 text-xs text-muted-foreground">Rondas temáticas esta semana</p>
        </Link>
        <Link href="/conexiones" className="glass group rounded-3xl p-5 transition-colors hover:border-primary/30">
          <span className="relative">
            <MessagesSquare className="mb-3 h-6 w-6 text-rose" />
            {connections.length > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose text-[10px] font-bold text-white">
                {connections.length}
              </span>
            )}
          </span>
          <p className="font-display font-semibold">Conexiones</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {connections.length === 0 ? "Todavía no hay matches" : `${connections.length} conversación${connections.length > 1 ? "es" : ""}`}
          </p>
        </Link>
      </div>

      {/* Manifiesto */}
      <div className="mt-10 rounded-3xl border border-border bg-surface/50 p-6 text-center">
        <p className="font-display text-lg font-semibold leading-relaxed text-balance">
          “No venimos a buscar perfiles.
          <br />
          Venimos a conocer personas.”
        </p>
      </div>
    </div>
  );
}
