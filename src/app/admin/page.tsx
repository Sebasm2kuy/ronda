"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, RefreshCw, Users, Flame, HeartHandshake, ShieldAlert, Radio } from "lucide-react";
import { apiGet, apiPost } from "@/lib/client";
import type { AdminStats } from "@/lib/types";
import { USER_STATUS, labelFor, REPORT_REASONS, LOOKING_FOR } from "@/lib/constants";
import { RondaMark } from "@/components/shell/app-shell";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);

  const loadStats = useCallback(() => {
    apiGet<AdminStats>("/api/admin/stats")
      .then((s) => {
        setStats(s);
        setAuthed(true);
      })
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const login = async () => {
    setError(null);
    try {
      await apiPost("/api/admin/login", { pin });
      loadStats();
    } catch {
      setError("PIN incorrecto");
    }
  };

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="relative flex min-h-screen items-center justify-center grain">
        <div className="ambient-glow" aria-hidden="true" />
        <div className="relative z-10 w-full max-w-sm px-6">
          <div className="mb-7 flex flex-col items-center text-center">
            <RondaMark size={44} />
            <h1 className="mt-4 font-display text-2xl font-bold">Panel administrador</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Acceso restringido al equipo de RONDA</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login();
            }}
            className="space-y-3"
          >
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN de administrador"
              className="w-full rounded-2xl border border-input bg-surface px-4 py-4 text-center font-mono text-lg tracking-[0.4em] outline-none focus:ring-2 focus:ring-ring/50"
              aria-label="PIN de administrador"
            />
            {error && <p className="text-center text-xs text-destructive">{error}</p>}
            <button type="submit" className="btn-ronda w-full">
              <Lock className="h-4 w-4" /> ENTRAR
            </button>
          </form>
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            MVP: el PIN por defecto es <code className="rounded bg-secondary px-1.5 py-0.5">ronda2026</code> (configurable por variable de entorno).
          </p>
        </div>
      </div>
    );
  }

  const cards = stats
    ? [
        { label: "Usuarios registrados", value: stats.users.total, sub: `${stats.users.real} reales · ${stats.users.demo} demo`, icon: Users },
        { label: "Conectados ahora", value: (stats.statusCounts["AVAILABLE"] ?? 0) + (stats.statusCounts["IN_ROUND"] ?? 0), sub: "disponibles + en ronda", icon: Radio },
        { label: "Rondas activas", value: stats.activeRounds, sub: `${stats.completedRounds} completadas`, icon: Flame },
        { label: "Conexiones", value: stats.connections, sub: `${stats.pendingConnections} pendientes`, icon: HeartHandshake },
        { label: "Reportes abiertos", value: stats.openReports, sub: "requieren revisión", icon: ShieldAlert },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Panel administrador</h1>
          <p className="mt-1 text-sm text-muted-foreground">Estado de la plataforma en tiempo real</p>
        </div>
        <button onClick={loadStats} className="btn-ghost !min-h-0 !py-2.5 !px-4 text-sm">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {stats && (
        <>
          {/* Tarjetas de estadísticas */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map(({ label, value, sub, icon: Icon }) => (
              <div key={label} className="rounded-3xl border border-border bg-surface/60 p-4">
                <Icon className="mb-2.5 h-5 w-5 text-primary" />
                <p className="font-display text-3xl font-bold">{value}</p>
                <p className="mt-0.5 text-xs font-medium">{label}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>

          {/* Distribución de estados */}
          <div className="mt-7 rounded-3xl border border-border bg-surface/60 p-5">
            <h2 className="mb-4 font-display font-bold">Estados de usuario</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {Object.entries(USER_STATUS).map(([key, label]) => (
                <div key={key} className="rounded-2xl bg-secondary/50 px-3 py-2.5 text-center">
                  <p className="font-display text-xl font-bold">{stats.statusCounts[key] ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {/* Usuarios */}
            <div className="rounded-3xl border border-border bg-surface/60 p-5">
              <h2 className="mb-4 font-display font-bold">Usuarios ({stats.usersList.length})</h2>
              <div className="nice-scroll max-h-96 space-y-2 overflow-y-auto pr-1">
                {stats.usersList.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-2xl bg-secondary/40 px-3.5 py-2.5">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl">
                      {u.photoUrl ? (
                         
                        <img src={u.photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-secondary text-sm font-bold">{u.name[0]}</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {u.name}, {u.age}
                        {u.isDemo && <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-muted-foreground">DEMO</span>}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{u.city} · {labelFor(u.lookingFor, LOOKING_FOR).toLowerCase()}{u.email.endsWith("ronda.local") ? "" : ` · ${u.email}`}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                        u.status === "IN_ROUND" ? "bg-primary/15 text-primary" :
                        u.status === "CONNECTED" ? "bg-rose/15 text-rose" :
                        u.status === "AVAILABLE" ? "bg-emerald-400/10 text-emerald-400" :
                        "bg-secondary text-muted-foreground"
                      )}
                    >
                      {USER_STATUS[u.status as keyof typeof USER_STATUS] ?? u.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              {/* Rondas */}
              <div className="rounded-3xl border border-border bg-surface/60 p-5">
                <h2 className="mb-4 font-display font-bold">Rondas ({stats.roundsList.length})</h2>
                <div className="nice-scroll max-h-64 space-y-2 overflow-y-auto pr-1">
                  {stats.roundsList.length === 0 && <p className="text-sm text-muted-foreground">Sin rondas todavía.</p>}
                  {stats.roundsList.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/40 px-3.5 py-2.5 text-sm">
                      <span className="truncate">{r.userA} ↔ {r.userB}</span>
                      <span className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                        r.status === "ACTIVE" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                      )}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reportes */}
              <div className="rounded-3xl border border-border bg-surface/60 p-5">
                <h2 className="mb-4 font-display font-bold">Reportes ({stats.reportsList.length})</h2>
                <div className="nice-scroll max-h-64 space-y-2 overflow-y-auto pr-1">
                  {stats.reportsList.length === 0 && <p className="text-sm text-muted-foreground">Sin reportes. Comunidad tranquila.</p>}
                  {stats.reportsList.map((r) => (
                    <div key={r.id} className="rounded-2xl bg-secondary/40 px-3.5 py-2.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{labelFor(r.reason, REPORT_REASONS)}</span>
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">{r.status}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {r.reporter} reportó a {r.reported} · {new Date(r.createdAt).toLocaleString("es-UY")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
