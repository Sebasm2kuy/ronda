"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, X, ArrowRight, Camera } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/client";
import type { PublicUser, LiveStatus, RoundInfo } from "@/lib/types";
import { RondaMark } from "@/components/shell/app-shell";

const SEARCH_MESSAGES = [
  "Estamos buscando a alguien para vos…",
  "Mirando quién está conectado ahora…",
  "Casi listo…",
];

type Stage = "checking" | "searching" | "ready" | "error";

export default function RondaPage() {
  const router = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [live, setLive] = useState<LiveStatus | null>(null);
  const [stage, setStage] = useState<Stage>("checking");
  const [round, setRound] = useState<RoundInfo | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [noVideo, setNoVideo] = useState(false);
  const joinedRef = useRef(false);

  // Sesión + chequeo de foto/video
  useEffect(() => {
    apiGet<{ user: PublicUser | null }>("/api/auth/session").then((d) => {
      if (!d.user) {
        router.replace("/");
        return;
      }
      setMe(d.user);
      if (!d.user.photoUrl) {
        toast.error("Primero completá tu foto de perfil");
        router.replace("/perfil");
        return;
      }
      if (!d.user.videoUrl) {
        // Sin presentación puede entrar igual, con un aviso.
        setNoVideo(true);
        return;
      }
      setStage("searching");
    });
  }, [router]);

  // Live status
  useEffect(() => {
    const load = () => apiGet<LiveStatus>("/api/stats").then(setLive).catch(() => {});
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, []);

  // Mensajes rotando
  useEffect(() => {
    if (stage !== "searching") return;
    const t = setInterval(() => setMsgIndex((i) => (i + 1) % SEARCH_MESSAGES.length), 2600);
    return () => clearInterval(t);
  }, [stage]);

  // Contador de espera
  useEffect(() => {
    if (stage !== "searching") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  // Entrar a la ronda (reserva de pareja en el servidor)
  const startRef = useRef(Date.now());
  const join = useCallback(async () => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    try {
      const d = await apiPost<{ round: RoundInfo }>("/api/rounds/join");
      // Minimum elegant wait: 3.5–6.5s of searching animation
      const minWait = 3500 + Math.random() * 3000;
      const waited = Date.now() - startRef.current;
      if (waited < minWait) {
        await new Promise((r) => setTimeout(r, minWait - waited));
      }
      setRound(d.round);
      setStage("ready");
    } catch (e) {
      joinedRef.current = false;
      toast.error(e instanceof Error ? e.message : "No pudimos entrar a la ronda");
      setStage("error");
    }
  }, []);

  useEffect(() => {
    if (stage === "searching" && me) {
      startRef.current = Date.now();
      join();
    }
  }, [stage, me, join]);

  const cancel = async () => {
    if (round) {
      await apiPost(`/api/rounds/${round.id}/leave`).catch(() => {});
    }
    router.replace("/inicio");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg flex-col px-5 py-8">
      <div className="mb-2 flex items-center justify-between">
        <Link href="/inicio" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Inicio
        </Link>
        <span className="font-mono text-xs text-muted-foreground">
          {stage === "searching" ? `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}` : ""}
        </span>
      </div>

      {/* Buscando */}
      {stage === "searching" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-10 h-56 w-56" aria-hidden="true">
            {/* anillos radar */}
            {[0, 0.8, 1.6].map((d) => (
              <span
                key={d}
                className="radar-ring absolute inset-0 rounded-full border border-primary/40"
                style={{ animationDelay: `${d}s` }}
              />
            ))}
            <div className="absolute inset-6 rounded-full border border-border bg-surface/40" />
            {/* barrido */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div
                className="radar-sweep absolute inset-0"
                style={{
                  background: "conic-gradient(from 0deg, rgba(240,180,41,0.25), transparent 18%)",
                }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl glass">
                <RondaMark size={30} />
              </div>
            </div>
            {/* puntos de personas */}
            <span className="absolute left-8 top-10 h-2 w-2 rounded-full bg-emerald-400/80" />
            <span className="absolute right-10 top-16 h-2 w-2 rounded-full bg-primary/80" />
            <span className="absolute bottom-12 left-14 h-2 w-2 rounded-full bg-rose/80" />
            <span className="absolute bottom-8 right-8 h-2 w-2 rounded-full bg-emerald-400/60" />
          </div>

          <p className="text-xs font-semibold tracking-[0.3em] text-primary mb-3">ESTÁS EN LA RONDA</p>
          <h1 className="font-display text-3xl font-bold text-balance">Buscando a tu persona</h1>
          <div className="mt-3 h-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={msgIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-muted-foreground"
              >
                {SEARCH_MESSAGES[msgIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {live && (
            <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="live-dot" aria-hidden="true" />
              {live.connected} personas conectadas · {live.inRound} en ronda ahora
            </p>
          )}

          <button onClick={cancel} className="btn-ghost mt-10 !min-h-0 !py-3 !px-6">
            <X className="h-4 w-4" /> Salir de la búsqueda
          </button>
        </div>
      )}

      {/* Cita lista */}
      {stage === "ready" && round && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }}>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-primary">
              <Flame className="h-3.5 w-3.5" /> TU CITA ESTÁ LISTA
            </p>
            <div className="relative mx-auto mb-6 h-48 w-40 overflow-hidden rounded-[2rem] border border-border shadow-2xl shadow-black/40">
              {round.partner.photoUrl ? (
                 
                <img src={round.partner.photoUrl} alt={`Foto de ${round.partner.name}`} className="kenburns h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-surface text-4xl font-bold text-muted-foreground">
                  {round.partner.name[0]}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left">
                <p className="font-display font-bold">{round.partner.name}, {round.partner.age}</p>
                <p className="text-xs text-muted-foreground">{round.partner.city}</p>
              </div>
            </div>

            <h1 className="font-display text-3xl font-bold text-balance">¿Entramos?</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              Tienen 5 minutos para conocerse. Aparecimos con alguien que también está listo ahora.
            </p>

            <div className="mt-8 space-y-3">
              <Link href={`/cita/${round.id}`} className="btn-ronda w-full max-w-xs shadow-[0_8px_40px_rgba(240,180,41,0.25)]">
                ENTRAR A LA RONDA <ArrowRight className="h-4 w-4" />
              </Link>
              <button onClick={cancel} className="block w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
                No ahora, salir de esta ronda
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Error */}
      {stage === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Camera className="mb-4 h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold">Ahora no pudimos encontrarte alguien</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
            Probá de nuevo en unos minutos: la ronda se mueve todo el día.
          </p>
          <div className="mt-8 space-y-3">
            <button
              onClick={() => {
                joinedRef.current = false;
                setStage("searching");
              }}
              className="btn-ronda w-full max-w-xs"
            >
              BUSCAR DE NUEVO
            </button>
            <Link href="/inicio" className="btn-ghost w-full max-w-xs">Volver al inicio</Link>
          </div>
        </div>
      )}

      {/* Aviso: presentación pendiente */}
      {stage === "checking" && noVideo && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
            <div className="glass rounded-3xl p-6">
              <h1 className="font-display text-2xl font-bold text-balance">Te falta tu presentación</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Tu presentación de 30 segundos es lo que la otra persona va a ver de vos. La ronda es mucho mejor con ella.
              </p>
              <div className="mt-6 space-y-3">
                <Link href="/onboarding/video" className="btn-ronda w-full">
                  <Camera className="h-4 w-4" /> GRABAR AHORA (30 SEG)
                </Link>
                <button onClick={() => setStage("searching")} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors">
                  Entrar a la ronda igual
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {stage === "checking" && !noVideo && (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
