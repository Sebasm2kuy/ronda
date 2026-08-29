"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { MessagesSquare, Flame } from "lucide-react";
import { apiGet } from "@/lib/client";
import type { ConnectionInfo } from "@/lib/types";
import { RondaMark } from "@/components/shell/app-shell";

const CONFETTI_COLORS = ["#f0b429", "#e8788a", "#8bc49a", "#f7d789", "#d9a5f5"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.8,
        duration: 2.6 + Math.random() * 2.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 7,
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function MatchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectionId = searchParams.get("id") ?? "";

  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!connectionId) return;
    apiGet<{ connections: ConnectionInfo[] }>("/api/connections")
      .then((d) => {
        const c = d.connections.find((x) => x.id === connectionId);
        if (c) setConnection(c);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [connectionId]);

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted-foreground">Esta conexión no está disponible.</p>
        <Link href="/inicio" className="btn-ronda">IR AL INICIO</Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen grain overflow-hidden">
      <Confetti />
      <div className="ambient-glow" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 200 }}
        >
          <RondaMark size={64} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-xs font-semibold tracking-[0.35em] text-primary"
        >
          🎉 HAY CONEXIÓN 🎉
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-warm-gradient mt-2 font-display text-5xl font-bold"
        >
          ¡Coincidieron!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-3 text-muted-foreground"
        >
          Los dos quieren volver a hablar.
        </motion.p>

        {connection && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-9 w-full"
          >
            <div className="mx-auto flex h-32 w-28 overflow-hidden rounded-[1.8rem] border border-primary/30 shadow-2xl shadow-black/40">
              {connection.partner.photoUrl ? (

                <img src={connection.partner.photoUrl} alt={connection.partner.name} className="kenburns h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-surface text-3xl font-bold">
                  {connection.partner.name[0]}
                </div>
              )}
            </div>
            <p className="mt-3 font-display text-lg font-bold">
              {connection.partner.name}, {connection.partner.age}
            </p>
            <p className="text-xs text-muted-foreground">{connection.partner.city}</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="mt-10 w-full space-y-3"
        >
          <Link href={`/chat/?id=${connectionId}`} className="btn-ronda w-full shadow-[0_8px_40px_rgba(240,180,41,0.3)]">
            <MessagesSquare className="h-5 w-5" /> ABRIR CHAT
          </Link>
          <button onClick={() => router.replace("/ronda")} className="btn-ghost w-full">
            <Flame className="h-4 w-4" /> VOLVER A LA RONDA
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export default function MatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <MatchInner />
    </Suspense>
  );
}
