"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Smile, Hand, Loader2, Flame } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/client";
import type { RoundInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

type Choice = "WANT_MORE" | "GOOD_VIBES" | "NEXT";

const OPTIONS: Array<{ value: Choice; label: string; desc: string; icon: typeof Heart; hot: boolean }> = [
  {
    value: "WANT_MORE",
    label: "QUIERO VOLVER A HABLAR",
    desc: "Si la otra persona también quiere, hay conexión y chat.",
    icon: Heart,
    hot: true,
  },
  {
    value: "GOOD_VIBES",
    label: "ME CAE MUY BIEN",
    desc: "Buenas vibras. Queda guardado por si hay una segunda ronda.",
    icon: Smile,
    hot: false,
  },
  {
    value: "NEXT",
    label: "SIGUIENTE",
    desc: "Estuvo bien, pero seguís conociedo a más personas.",
    icon: Hand,
    hot: false,
  },
];

export default function FinRondaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roundId = params?.id ?? "";

  const [round, setRound] = useState<RoundInfo | null>(null);
  const [sending, setSending] = useState<Choice | null>(null);
  const [result, setResult] = useState<{ matched: boolean; pending: boolean } | null>(null);

  useEffect(() => {
    if (!roundId) return;
    apiGet<{ round: RoundInfo }>(`/api/rounds/${roundId}`)
      .then((d) => setRound(d.round))
      .catch(() => router.replace("/inicio"));
  }, [roundId, router]);

  const choose = async (choice: Choice) => {
    if (sending) return;
    setSending(choice);
    try {
      const res = await apiPost<{ matched: boolean; pending?: boolean; connectionId?: string }>(
        `/api/rounds/${roundId}/choice`,
        { choice }
      );
      if (res.matched && res.connectionId) {
        router.replace(`/match/${res.connectionId}`);
        return;
      }
      setResult({ matched: false, pending: Boolean(res.pending) });
    } catch (e) {
      if (e instanceof ApiError && e.code === "ERROR") {
        router.replace("/inicio");
        return;
      }
      // Ya decidió: llevar al inicio sin error ruidoso
      router.replace("/inicio");
    }
  };

  // Pantalla de resultado neutro (no se revela la elección de la otra persona)
  if (result) {
    return (
      <div className="relative min-h-screen grain">
        <div className="ambient-glow" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/12">
              <Flame className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold text-balance">
              {result.pending
                ? "Quedó todo anotado"
                : "Listo, ¡gracias por la ronda!"}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {result.pending
                ? "A veces la mejor conexión necesita una segunda oportunidad. Si las cosas se alinean, nos vas a enterar primero vos."
                : "Hay más personas esperando conocerte. La próxima ronda puede ser la buena."}
            </p>
            <div className="mt-9 space-y-3">
              <button onClick={() => router.replace("/ronda")} className="btn-ronda w-full max-w-xs">
                <Flame className="h-4 w-4" /> VOLVER A LA RONDA
              </button>
              <button onClick={() => router.replace("/inicio")} className="btn-ghost w-full max-w-xs">
                Ir al inicio
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const partner = round.partner;

  return (
    <div className="relative min-h-screen grain">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-primary mb-3">SE TERMINÓ LA RONDA</p>
            <h1 className="font-display text-3xl font-bold text-balance">
              ¿Cómo te sentiste hablando con esta persona?
            </h1>
            <div className="mt-5 flex items-center justify-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full border border-border">
                {partner.photoUrl ? (
                   
                  <img src={partner.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center font-bold">{partner.name[0]}</div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{partner.name}, {partner.age} · {partner.city}</p>
            </div>
          </div>

          <div className="space-y-3">
            {OPTIONS.map(({ value, label, desc, icon: Icon, hot }, i) => (
              <motion.button
                key={value}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                onClick={() => choose(value)}
                disabled={sending !== null}
                className={cn(
                  "group flex w-full items-center gap-4 rounded-3xl border p-5 text-left transition-all disabled:opacity-60",
                  hot
                    ? "border-rose/40 bg-gradient-to-r from-rose/12 to-primary/8 hover:border-rose/70"
                    : "border-border bg-surface/70 hover:border-foreground/25"
                )}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105",
                    hot ? "bg-rose/15 text-rose" : "bg-secondary text-foreground"
                  )}
                >
                  {sending === value ? <Loader2 className="h-6 w-6 animate-spin" /> : <Icon className="h-6 w-6" />}
                </span>
                <span>
                  <span className={cn("block font-display font-bold tracking-wide", hot && "text-rose")}>
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
                </span>
              </motion.button>
            ))}
          </div>

          <p className="mt-7 text-center text-xs leading-relaxed text-muted-foreground">
            La respuesta de la otra persona queda en secreto hasta que haya match.
            Nadie se entera de lo que elegís si no es mutuo.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
