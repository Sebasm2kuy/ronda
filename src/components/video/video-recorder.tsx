"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, CameraOff, Check, Circle, Loader2, Mic, MicOff, RefreshCw,
  Square, Upload, VideoIcon, AlertTriangle, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { PRESENTATION_SECONDS } from "@/lib/constants";
import { saveMediaBlob } from "@/lib/browser-api";
import { cn } from "@/lib/utils";

type Phase =
  | "idle"        // pidiendo permisos
  | "ready"       // cámara lista, preview en vivo
  | "recording"   // grabando
  | "recorded"    // grabado, preview
  | "uploading"   // subiendo
  | "error";      // sin cámara o permiso denegado

function pickMime(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
}

export default function VideoRecorder({
  onSaved,
  onSkip,
  autoStart = true,
}: {
  onSaved: (url: string) => void;
  onSkip?: () => void;
  autoStart?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(PRESENTATION_SECONDS);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const openCamera = useCallback(async () => {
    setPhase("idle");
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamOn(true);
      setMicOn(true);
      setPhase("ready");
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === "NotFoundError" || name === "OverconstrainedError") {
        setErrorMsg("No encontramos una cámara conectada. Podés continuar y grabar tu presentación más tarde.");
      } else if (name === "NotAllowedError" || name === "SecurityError") {
        setErrorMsg("Necesitamos permiso de cámara y micrófono para grabar tu presentación. Habilitalos en el navegador e intentá de nuevo.");
      } else {
        setErrorMsg("No pudimos abrir la cámara. Probá de nuevo o continuá sin video por ahora.");
      }
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    // Defer para no llamar setState directamente dentro del effect (react-hooks lint)
    const t = autoStart ? setTimeout(() => openCamera(), 0) : null;
    return () => {
      if (t) clearTimeout(t);
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoStart, openCamera, stopStream]);

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const mime = pickMime();
    if (!mime) {
      setErrorMsg("Tu navegador no soporta grabación de video. Probá con Chrome, Edge o Firefox actualizados.");
      setPhase("error");
      return;
    }
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_600_000 });
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        setBlobUrl(URL.createObjectURL(blob));
        setPhase("recorded");
      };
      recorder.start(250);
      setSecondsLeft(PRESENTATION_SECONDS);
      setPhase("recording");
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            stopRecordingNow();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch {
      setErrorMsg("No pudimos iniciar la grabación. Intentá de nuevo.");
      setPhase("error");
    }
  };

  const stopRecordingNow = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    stopRecordingNow();
    setPhase("ready");
  };

  const retry = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    openCamera();
  };

  const save = async () => {
    if (!blobUrl) return;
    setPhase("uploading");
    try {
      const blob = await (await fetch(blobUrl)).blob();
      const url = await saveMediaBlob(blob, "videos");
      onSaved(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pudimos guardar tu video");
      setPhase("recorded");
    }
  };

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  };

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const progress = secondsLeft / PRESENTATION_SECONDS;

  return (
    <div className="w-full">
      {/* Vista previa */}
      <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-[2rem] border border-border bg-black shadow-2xl shadow-black/50 sm:aspect-video">
        {/* En vivo */}
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className={cn(
            "h-full w-full scale-x-[-1] object-cover transition-opacity",
            (phase === "ready" || phase === "recording") && camOn ? "opacity-100" : "opacity-0"
          )}
          aria-label="Vista previa de tu cámara"
        />
        {/* Grabado */}
        {phase === "recorded" && blobUrl && (
          <video
            ref={previewRef}
            src={blobUrl}
            controls
            playsInline
            className="absolute inset-0 h-full w-full object-contain bg-black"
            aria-label="Tu presentación grabada"
          />
        )}

        {/* Placeholder sin cámara */}
        {(phase === "idle" || phase === "error" || (phase !== "recorded" && !camOn)) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            {phase === "idle" ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Abriendo tu cámara…</p>
              </>
            ) : phase === "error" ? (
              <>
                <CameraOff className="h-8 w-8" />
                <p className="max-w-[80%] text-center text-sm leading-relaxed">{errorMsg}</p>
                <button onClick={openCamera} className="btn-ghost !min-h-0 !py-2.5 mt-1">
                  <RefreshCw className="h-4 w-4" /> Intentar de nuevo
                </button>
              </>
            ) : (
              <>
                <CameraOff className="h-8 w-8" />
                <p className="text-sm">Cámara apagada</p>
              </>
            )}
          </div>
        )}

        {/* Indicadores superiores */}
        {(phase === "ready" || phase === "recording") && (
          <>
            <div className="absolute left-4 top-4 flex items-center gap-2">
              {phase === "recording" ? (
                <span className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 font-mono text-sm backdrop-blur">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
                  {mmss}
                </span>
              ) : (
                <span className="rounded-full bg-black/50 px-3 py-1.5 font-mono text-xs text-muted-foreground backdrop-blur">
                  {PRESENTATION_SECONDS}s máx
                </span>
              )}
            </div>
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur",
                  micOn ? "text-foreground" : "text-destructive"
                )}
                aria-label={micOn ? "Micrófono activo" : "Micrófono silenciado"}
              >
                {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </span>
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur",
                  camOn ? "text-foreground" : "text-destructive"
                )}
                aria-label={camOn ? "Cámara activa" : "Cámara apagada"}
              >
                {camOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
              </span>
            </div>
          </>
        )}

        {/* Anillo de progreso al grabar */}
        {phase === "recording" && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <div
              className="h-full bg-gradient-to-r from-amber-deep to-primary transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Textos y acciones por fase */}
      <div className="mt-7 text-center">
        <AnimatePresence mode="wait">
          {phase === "ready" && (
            <motion.div key="ready" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="mb-5 text-sm text-muted-foreground">
                Mirá a la cámara, respirá y contá quién sos. Tenés {PRESENTATION_SECONDS} segundos.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={startRecording} className="btn-ronda px-10">
                  <Circle className="h-4 w-4 fill-current" /> GRABAR
                </button>
                <button onClick={toggleMic} className="btn-ghost !min-h-0 !py-4 !px-4" aria-label={micOn ? "Silenciar micrófono" : "Activar micrófono"}>
                  {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-destructive" />}
                </button>
              </div>
            </motion.div>
          )}

          {phase === "recording" && (
            <motion.div key="rec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="mb-5 text-sm text-shimmer font-medium">Grabando… sé vos, no hace falta perfección.</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => stopRecordingNow()} className="btn-ronda px-10">
                  <Square className="h-4 w-4 fill-current" /> TERMINAR
                </button>
                <button onClick={cancelRecording} className="btn-ghost !min-h-0 !py-4 !px-5">
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}

          {phase === "recorded" && (
            <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="font-display text-2xl font-bold mb-1">¿Te gusta tu presentación?</p>
              <p className="mb-6 text-sm text-muted-foreground">Podés mirarla otra vez antes de decidir.</p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button onClick={save} className="btn-ronda w-full max-w-xs sm:w-auto">
                  {phase === "uploading" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  USAR ESTE VIDEO
                </button>
                <button onClick={retry} className="btn-ghost w-full max-w-xs sm:w-auto">
                  <RefreshCw className="h-4 w-4" /> GRABAR DE NUEVO
                </button>
              </div>
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mx-auto mb-4 flex max-w-md items-start gap-2 rounded-2xl bg-destructive/10 border border-destructive/25 p-4 text-left text-xs leading-relaxed text-foreground/85">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>
                  La grabación directa desde la plataforma es la base de la confianza en RONDA: no se permiten
                  videos subidos ni editados. {errorMsg}
                </span>
              </div>
              {onSkip && (
                <button onClick={onSkip} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors">
                  Continuar sin video por ahora
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Escape opcional siempre visible para el MVP */}
        {onSkip && (phase === "ready" || phase === "recorded") && (
          <button
            onClick={onSkip}
            className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Continuar sin video por ahora <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
