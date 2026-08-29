"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Users, Check, Loader2, Flame } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost, apiDelete } from "@/lib/client";
import type { EventInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function EventosPage() {
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    apiGet<{ events: EventInfo[] }>("/api/events")
      .then((d) => {
        setEvents(d.events);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (e: EventInfo) => {
    setBusy(e.id);
    try {
      if (e.joined) {
        await apiDelete(`/api/events/${e.id}/join`);
        toast("Liberaste tu lugar", { description: e.title });
      } else {
        await apiPost(`/api/events/${e.id}/join`);
        toast.success("¡Lugar reservado!", { description: `${e.title} · ${e.dateLabel}` });
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos registrar tu lugar");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <p className="text-xs font-semibold tracking-[0.3em] text-primary mb-2">RONDA EN VIVO</p>
      <h1 className="font-display text-3xl font-bold">Eventos</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Rondas temáticas con hora y lugar. Reservás tu lugar y te conectamos ahí.
      </p>

      {!loaded ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          {events.map((e, i) => {
            const full = e.spotsLeft === 0;
            return (
              <motion.article
                key={e.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn(
                  "relative overflow-hidden rounded-[1.8rem] border p-5 sm:p-6 transition-colors",
                  e.joined ? "border-primary/45 bg-primary/6" : "border-border bg-surface/60"
                )}
              >
                {e.joined && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground">
                    <Check className="h-3 w-3" /> RESERVADO
                  </span>
                )}
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary/80 text-3xl" aria-hidden="true">
                    {e.emoji}
                  </div>
                  <div className="min-w-0 flex-1 pr-16 sm:pr-0">
                    <h2 className="font-display text-xl font-bold">{e.title}</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" /> {e.dateLabel}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {full ? "Completo" : `${e.spotsLeft} lugares de ${e.capacity}`}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{e.description}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-primary/90">
                    <Flame className="h-3.5 w-3.5" />
                    Rondas de 5 minutos durante todo el evento
                  </span>
                  <button
                    onClick={() => toggle(e)}
                    disabled={busy === e.id || (full && !e.joined)}
                    className={cn(
                      e.joined ? "btn-ghost !min-h-0 !py-2.5 !px-5 text-sm" : "btn-ronda !min-h-0 !py-2.5 !px-5 text-sm",
                      full && !e.joined && "opacity-50"
                    )}
                  >
                    {busy === e.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : e.joined ? (
                      "LIBERAR LUGAR"
                    ) : full ? (
                      "COMPLETO"
                    ) : (
                      "RESERVAR LUGAR"
                    )}
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
