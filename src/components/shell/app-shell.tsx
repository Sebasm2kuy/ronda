"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Flame, Ticket, MessagesSquare, User, LogOut, ShieldCheck } from "lucide-react";
import { apiGet, apiPost } from "@/lib/client";
import type { PublicUser, LiveStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/ronda", label: "Ronda", icon: Flame },
  { href: "/eventos", label: "Eventos", icon: Ticket },
  { href: "/conexiones", label: "Conexiones", icon: MessagesSquare },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function RondaMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="rgba(240,180,41,0.10)" />
      <circle cx="32" cy="30" r="14" stroke="#F0B429" strokeWidth="3.5" />
      <path d="M22 52c3-4.5 6.4-6.5 10-6.5s7 2 10 6.5" stroke="#E8788A" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="45.5" cy="18.5" r="4" fill="#E8788A" />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [live, setLive] = useState<LiveStatus | null>(null);

  useEffect(() => {
    apiGet<{ user: PublicUser | null }>("/api/auth/session")
      .then((d) => {
        if (!d.user) router.replace("/");
        else setMe(d.user);
      })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    const load = () => apiGet<LiveStatus>("/api/stats").then(setLive).catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const logout = async () => {
    await apiPost("/api/auth/logout").catch(() => {});
    router.replace("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="ambient-glow" aria-hidden="true" />

      {/* Header móvil */}
      <header className="lg:hidden sticky top-0 z-40 glass border-b border-border/60">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/inicio" className="flex items-center gap-2">
            <RondaMark size={26} />
            <span className="font-display font-bold tracking-[0.18em] text-sm">RONDA</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="live-dot" aria-hidden="true" />
            <span>{live ? `${live.connected} personas conectadas` : "conectando…"}</span>
          </div>
        </div>
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur-xl">
        <div className="p-6">
          <Link href="/inicio" className="flex items-center gap-3">
            <RondaMark size={34} />
            <span className="font-display font-bold tracking-[0.22em]">RONDA</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1" aria-label="Navegación principal">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 space-y-2 border-t border-border/60">
          {live && (
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <span className="live-dot" aria-hidden="true" />
              {live.connected} personas conectadas · {live.inRound} en ronda
            </div>
          )}
          <Link
            href="/admin"
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShieldCheck size={14} /> Panel administrador
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut size={14} /> Cerrar sesión{me ? ` (${me.name})` : ""}
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="relative z-10 flex-1 lg:pl-64">{children}</main>

      {/* Nav inferior móvil */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border/60 pb-safe"
        aria-label="Navegación principal"
      >
        <div className="grid grid-cols-5 max-w-lg mx-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={21} strokeWidth={active ? 2.4 : 1.9} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Espacio para la barra inferior móvil */}
      <div className="lg:hidden h-20" aria-hidden="true" />
    </div>
  );
}
