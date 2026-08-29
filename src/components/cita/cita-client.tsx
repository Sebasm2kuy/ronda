"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, CameraOff, Mic, MicOff, PhoneOff, ShieldAlert, ShieldBan,
  Loader2, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/client";
import type { PublicUser, RoundInfo } from "@/lib/types";
import { ROUND_SECONDS, REPORT_REASONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import ConversationHost from "@/components/cita/conversation-host";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type CallPhase = "loading" | "connecting" | "live" | "ending";
type MediaPhase = "asking" | "granted" | "denied";

export default function CitaClient({ roundId: roundIdProp }: { roundId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roundId = roundIdProp || searchParams.get("id") || "";

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finishedRef = useRef(false);

  const [round, setRound] = useState<RoundInfo | null>(null);
  const [me, setMe] = useState<PublicUser | null>(null);
  const [callPhase, setCallPhase] = useState<CallPhase>("loading");
  const [mediaPhase, setMediaPhase] = useState<MediaPhase>("asking");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0].value);

  // Cargar ronda + mi perfil (para el motor de conversación)
  useEffect(() => {
    if (!roundId) return;
    apiGet<{ round: RoundInfo }>(`/api/rounds/${roundId}`)
      .then((d) => {
        setRound(d.round);
        setCallPhase("connecting");
      })
      .catch(() => router.replace("/ronda"));

    apiGet<{ user: PublicUser }>("/api/users/me")
      .then((d) => setMe(d.user))
      .catch(() => {});
  }, [roundId, router]);

  // Cámara local
  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(() => {});
      }
      setMediaPhase("granted");
    } catch {
      setMediaPhase("denied");
    }
  }, []);

  useEffect(() => {
    if (callPhase !== "connecting") return;
    const t = setTimeout(() => {
      openCamera();
    }, 0);
    return () => clearTimeout(t);
  }, [callPhase, openCamera]);

  // Liberar cámara al salir
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Secuencia de conexión (simulada, 2s) → live
  useEffect(() => {
    if (callPhase !== "connecting") return;
    const t = setTimeout(() => setCallPhase("live"), 2200);
    return () => clearTimeout(t);
  }, [callPhase]);

  // El motor de conversación arranca cuando la llamada está "live"
  // (se monta ConversationHost abajo; los rompehielos estáticos
  // fueron reemplazados por el motor adaptativo).

  // Timer de la ronda
  const finishRound = useCallback(async () => {
    if (finishedRef.current || !roundId) return;
    finishedRef.current = true;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCallPhase("ending");
    await apiPost(`/api/rounds/${roundId}/finish`).catch(() => {});
    router.replace(`/cita/fin/?id=${roundId}`);
  }, [roundId, router]);

  useEffect(() => {
    if (callPhase !== "live") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          finishRound();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [callPhase, finishRound]);

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  };

  const doReport = async () => {
    if (!round) return;
    setReportOpen(false);
    await apiPost("/api/reports", {
      reportedId: round.partner.id,
      reason: reportReason,
    }).catch(() => {});
    toast.success("Gracias. Nuestro equipo lo va a revisar.");
  };

  const doBlock = async () => {
    if (!round) return;
    setBlockOpen(false);
    await apiPost("/api/blocks", { blockedId: round.partner.id }).catch(() => {});
    toast.success("Persona bloqueada. No volverán a coincidir.");
    router.replace("/inicio");
  };

  if (callPhase === "loading" || !round) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const partner = round.partner;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-foreground">
      {/* Video principal: la otra persona */}
      <div className="relative flex-1 overflow-hidden">
        <video
          src={partner.videoUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          className={cn(
            "h-full w-full object-cover transition-opacity duration-1000",
            callPhase === "live" ? "opacity-95 kenburns" : "opacity-0"
          )}
          aria-label={`Video de ${partner.name}`}
        />
        {/* Fallback con foto mientras conecta */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-2 via-surface to-black transition-opacity duration-1000",
            callPhase === "live" ? "opacity-0" : "opacity-100"
          )}
        >
          {partner.photoUrl ? (
             
            <img src={partner.photoUrl} alt="" className="kenburns h-full w-full object-cover opacity-60" />
          ) : null}
          <div className="absolute flex flex-col items-center gap-3">
            <div className="relative">
              <span className="radar-ring absolute inset-0 rounded-full border border-primary/60" />
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-primary/60">
                {partner.photoUrl ? (
                   
                  <img src={partner.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl font-bold">{partner.name[0]}</div>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Conectando con {partner.name}…</p>
          </div>
        </div>

        {/* Viñeta superior */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/80 to-transparent" />

        {/* Barra superior */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button
            onClick={() => setConfirmEnd(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur transition-colors hover:bg-black/70"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Timer */}
          <div className="flex flex-col items-center">
            <span className={cn(
              "font-mono text-2xl font-semibold tracking-wider",
              secondsLeft <= 30 ? "text-destructive" : "text-foreground"
            )}>
              {mmss}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur">
              <span className="live-dot" aria-hidden="true" /> RONDA EN VIVO
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur transition-colors hover:bg-black/70"
              aria-label="Reportar a esta persona"
            >
              <ShieldAlert className="h-5 w-5" />
            </button>
            <button
              onClick={() => setBlockOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur transition-colors hover:bg-black/70"
              aria-label="Bloquear a esta persona"
            >
              <ShieldBan className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Nombre + calidad */}
        <div className="absolute bottom-4 left-4">
          <p className="font-display text-xl font-bold drop-shadow-lg">{partner.name}, {partner.age}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPinTiny /> {partner.city}
          </p>
        </div>
        <div className="absolute bottom-4 right-4 flex items-end gap-[3px] h-4" aria-hidden="true">
          {[0.6, 1, 0.5, 0.85, 0.4].map((d, i) => (
            <span
              key={i}
              className="eq-bar w-[3px] rounded-full bg-emerald-400/90"
              style={{ height: "100%", animationDelay: `${i * 0.15}s`, animationDuration: `${0.6 + d * 0.4}s` }}
            />
          ))}
          <span className="ml-1 text-[10px] text-emerald-400/90">HD</span>
        </div>
      </div>

      {/* Video propio (PiP) */}
      <div className="absolute right-4 top-20 z-10 h-32 w-24 overflow-hidden rounded-2xl border border-white/15 bg-surface shadow-2xl sm:right-6 sm:top-24 sm:h-44 sm:w-32">
        <video
          ref={localVideoRef}
          muted
          playsInline
          autoPlay
          className={cn("h-full w-full scale-x-[-1] object-cover", camOn ? "opacity-100" : "opacity-0")}
          aria-label="Tu cámara"
        />
        {!camOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-2">
            <CameraOff className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium backdrop-blur">
          Vos
        </span>
        {!micOn && (
          <span className="absolute right-1.5 top-1.5 rounded-md bg-destructive/85 p-1">
            <MicOff className="h-3 w-3 text-white" />
          </span>
        )}
      </div>

      {/* Motor de conversación adaptativo (captions + tarjetas + composer) */}
      <ConversationHost
        roundId={roundId}
        partner={{ name: partner.name, interests: partner.interests }}
        me={me ? { name: me.name, interests: me.interests } : null}
        callPhase={callPhase}
        secondsLeft={secondsLeft}
      />

      {/* Controles */}
      <div className="relative z-10 flex items-center justify-center gap-4 bg-black/85 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
        <button
          onClick={toggleMic}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full transition-all",
            micOn ? "bg-secondary text-foreground hover:bg-secondary/70" : "bg-destructive text-white"
          )}
          aria-label={micOn ? "Silenciar micrófono" : "Activar micrófono"}
        >
          {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </button>
        <button
          onClick={() => setConfirmEnd(true)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white shadow-[0_8px_30px_rgba(229,72,77,0.4)] transition-transform hover:scale-105 active:scale-95"
          aria-label="Finalizar ronda"
        >
          {callPhase === "ending" ? <Loader2 className="h-7 w-7 animate-spin" /> : <PhoneOff className="h-7 w-7" />}
        </button>
        <button
          onClick={toggleCam}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full transition-all",
            camOn ? "bg-secondary text-foreground hover:bg-secondary/70" : "bg-destructive text-white"
          )}
          aria-label={camOn ? "Apagar cámara" : "Encender cámara"}
        >
          {camOn ? <Camera className="h-6 w-6" /> : <CameraOff className="h-6 w-6" />}
        </button>
      </div>

      {/* Permiso denegado: overlay */}
      {mediaPhase === "denied" && callPhase !== "ending" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 p-6">
          <div className="glass max-w-sm rounded-3xl p-6 text-center">
            <CameraOff className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h2 className="font-display text-xl font-bold">Tu cámara no está disponible</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Podés continuar la ronda solo con audio, o habilitar la cámara en los permisos del navegador.
            </p>
            <div className="mt-5 space-y-2">
              <button onClick={() => openCamera()} className="btn-ronda w-full">
                <Camera className="h-4 w-4" /> INTENTAR DE NUEVO
              </button>
              <button onClick={() => setMediaPhase("granted")} className="btn-ghost w-full">
                Continuar sin mi cámara
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar finalizar */}
      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent className="max-w-sm rounded-3xl bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="font-display">¿Terminar la ronda ahora?</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Quedan {mmss}. Si terminás ahora van directo a la parte de decidir: los dos eligen si quieren seguir hablando.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-2">
            <button onClick={finishRound} className="btn-ronda w-full bg-destructive text-white">
              SÍ, TERMINAR
            </button>
            <button onClick={() => setConfirmEnd(false)} className="btn-ghost w-full">
              SEGUIR HABLANDO
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reportar */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm rounded-3xl bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Reportar a {partner.name}</DialogTitle>
            <DialogDescription className="text-sm">
              Cuéntanos qué pasó. El equipo de RONDA lo revisa con prioridad.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-sm transition-colors",
                  reportReason === r.value ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/50"
                )}
              >
                <input
                  type="radio"
                  name="reason"
                  checked={reportReason === r.value}
                  onChange={() => setReportReason(r.value)}
                  className="h-4 w-4 accent-[#f0b429]"
                />
                {r.label}
              </label>
            ))}
          </div>
          <button onClick={doReport} className="btn-ronda mt-2 w-full">
            ENVIAR REPORTE
          </button>
        </DialogContent>
      </Dialog>

      {/* Bloquear */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="max-w-sm rounded-3xl bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="font-display">¿Bloquear a {partner.name}?</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Se termina la ronda y no van a volver a coincidir. No podrá contactarte.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-2">
            <button onClick={doBlock} className="btn-ronda w-full bg-destructive text-white">
              BLOQUEAR
            </button>
            <button onClick={() => setBlockOpen(false)} className="btn-ghost w-full">
              CANCELAR
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MapPinTiny() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
