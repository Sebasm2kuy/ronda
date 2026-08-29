"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessagesSquare, ChevronRight, Lock, Sparkles } from "lucide-react";
import { apiGet } from "@/lib/client";
import type { ConnectionInfo } from "@/lib/types";

export default function ConexionesPage() {
  const [active, setActive] = useState<ConnectionInfo[]>([]);
  const [pending, setPending] = useState<ConnectionInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiGet<{ connections: ConnectionInfo[]; pending: ConnectionInfo[] }>("/api/connections")
      .then((d) => {
        setActive(d.connections);
        setPending(d.pending);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const preview = (c: ConnectionInfo) => {
    if (!c.lastMessage) return "Coincidieron en una ronda · abrí el chat";
    return `${c.lastMessage.mine ? "Vos: " : ""}${c.lastMessage.content}`;
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-3xl font-bold">Conexiones</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Personas con las que los dos quisieron volver a hablar.
      </p>

      {!loaded ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : active.length === 0 ? (
        <div className="mt-12 flex flex-col items-center rounded-[2rem] glass p-10 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
            <MessagesSquare className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold">Todavía no hay conexiones</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Entrá a una ronda: si los dos quieren volver a hablar, aparece el chat acá.
          </p>
          <Link href="/ronda" className="btn-ronda mt-6">
            ENTRAR A LA RONDA
          </Link>
        </div>
      ) : (
        <div className="mt-7 space-y-3">
          {active.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link
                href={`/chat/${c.id}`}
                className="group flex items-center gap-4 rounded-3xl border border-border bg-surface/60 p-4 transition-colors hover:border-primary/40"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
                  {c.partner.photoUrl ? (
                     
                    <img src={c.partner.photoUrl} alt={c.partner.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary font-bold">{c.partner.name[0]}</div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold">
                    {c.partner.name}, {c.partner.age}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{c.partner.city}</span>
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{preview(c)}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Conversaciones pendientes — función preparada, desactivada en el MVP */}
      <section className="mt-12">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Conversaciones pendientes</h2>
          <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[10px] font-bold tracking-wider text-muted-foreground">
            PRÓXIMAMENTE
          </span>
        </div>
        <div className="rounded-3xl border border-dashed border-border bg-surface/30 p-6 text-center opacity-80">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/70">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {pending.length > 0
              ? `Tenés ${pending.length} conexión${pending.length > 1 ? "es" : ""} esperando una segunda oportunidad. Pronto vas a poder reencontrarlos en otra ronda.`
              : "Si dos personas se conocieron y ninguna estaba segura, podrán reencontrarse en otra ronda. Esta función llega pronto."}
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary/80">
            <Sparkles className="h-3 w-3" /> Segunda oportunidad en la ronda
          </p>
        </div>
      </section>
    </div>
  );
}
