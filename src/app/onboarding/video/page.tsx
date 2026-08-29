"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, Mic, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/client";
import type { PublicUser } from "@/lib/types";
import VideoRecorder from "@/components/video/video-recorder";
import { RondaMark } from "@/components/shell/app-shell";

export default function OnboardingVideoPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [me, setMe] = useState<PublicUser | null>(null);

  useEffect(() => {
    apiGet<{ user: PublicUser | null }>("/api/auth/session").then((d) => {
      if (!d.user) {
        router.replace("/");
        return;
      }
      setMe(d.user);
      setChecked(true);
    });
  }, [router]);

  const saveVideo = async (url: string) => {
    try {
      await apiPatch("/api/users/me", { videoUrl: url });
      toast.success("¡Presentación guardada!");
      router.replace("/ronda");
    } catch {
      toast.error("No pudimos guardar tu presentación. Intentá de nuevo.");
    }
  };

  const skip = async () => {
    toast("Podés grabar tu presentación cuando quieras desde tu perfil.", {
      description: "Sin presentación es más difícil conectar: te recomendamos grabarla pronto.",
    });
    router.replace("/ronda");
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="ambient-glow" aria-hidden="true" />
        <RondaMark size={44} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen grain">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-2xl px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-primary mb-3">
              {me?.name ? `${me.name.toUpperCase()}, ESTE ES TU MOMENTO` : "ESTE ES TU MOMENTO"}
            </p>
            <h1 className="font-display text-4xl font-bold text-balance sm:text-5xl">
              Ahora te toca <span className="text-warm-gradient">a vos</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground text-balance">
              Tenés 30 segundos para presentarte.
              <br />
              No buscamos un video perfecto.
              <br />
              Queremos conocerte.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {/* Consentimiento cámara/micrófono */}
          <div className="mx-auto mb-7 flex max-w-md items-start gap-3 rounded-2xl border border-border bg-surface/70 p-4 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Tu presentación se graba <strong className="text-foreground">directamente acá</strong> y solo se
              muestra dentro de RONDA. No se permiten videos subidos desde el dispositivo. Al grabar autorizás el
              uso de <Camera className="inline h-3 w-3" /> cámara y <Mic className="inline h-3 w-3" /> micrófono
              durante la grabación (ver{" "}
              <a href="/privacidad" target="_blank" className="underline underline-offset-2">privacidad</a>).
            </p>
          </div>

          <VideoRecorder onSaved={saveVideo} onSkip={skip} />
        </motion.div>
      </div>
    </div>
  );
}
