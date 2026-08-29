"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, SendHorizontal, ShieldAlert, ShieldBan } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/client";
import type { ConnectionInfo, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  // Cargar conexión + mensajes
  useEffect(() => {
    if (!id) return;
    apiGet<{ connections: ConnectionInfo[] }>("/api/connections")
      .then((d) => {
        const c = d.connections.find((x) => x.id === id);
        if (!c) {
          router.replace("/conexiones");
          return;
        }
        setConnection(c);
      })
      .catch(() => router.replace("/conexiones"));
  }, [id, router]);

  // Polling de mensajes
  useEffect(() => {
    if (!id) return;
    let active = true;
    const poll = async () => {
      try {
        const d = await apiGet<{ messages: ChatMessage[] }>(`/api/connections/${id}/messages`);
        if (!active) return;
        setMessages((prev) => {
          if (prev.length !== d.messages.length && d.messages.length > 0) {
            // si hay nuevos, scroll
            setTimeout(scrollToBottom, 80);
          }
          return d.messages;
        });
        setLoaded(true);
      } catch {
        /* silencioso */
      }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [id, scrollToBottom]);

  useEffect(() => {
    setTimeout(scrollToBottom, 150);
  }, [loaded, scrollToBottom]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");
    try {
      const d = await apiPost<{ message: ChatMessage }>(`/api/connections/${id}/messages`, { content });
      setMessages((prev) => [...prev, d.message]);
      setTimeout(scrollToBottom, 60);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar el mensaje");
      setText(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (!connection) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const p = connection.partner;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col lg:h-screen">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
        <Link href="/conexiones" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary transition-colors" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link href={`/chat/${id}`} className="h-10 w-10 overflow-hidden rounded-full border border-border">
          {p.photoUrl ? (
             
            <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-bold">{p.name[0]}</div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <p className="truncate font-display font-semibold">{p.name}, {p.age}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="live-dot" aria-hidden="true" /> Match de RONDA · {p.city}
          </p>
        </div>
        <button
          onClick={async () => {
            await apiPost("/api/reports", { reportedId: p.id, reason: "INAPPROPRIATE" }).catch(() => {});
            toast.success("Reporte enviado. Gracias por cuidar la comunidad.");
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Reportar"
        >
          <ShieldAlert className="h-4.5 w-4.5" size={18} />
        </button>
        <button
          onClick={async () => {
            if (!confirm(`¿Bloquear a ${p.name}? Se cierra la conversación y no volverán a coincidir.`)) return;
            await apiPost("/api/blocks", { blockedId: p.id }).catch(() => {});
            toast.success("Persona bloqueada.");
            router.replace("/conexiones");
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive transition-colors"
          aria-label="Bloquear"
        >
          <ShieldBan size={18} />
        </button>
      </header>

      {/* Mensajes */}
      <div className="nice-scroll flex-1 space-y-3 overflow-y-auto px-4 py-5">
        <div className="mx-auto mb-4 max-w-md rounded-2xl border border-border bg-surface/50 px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground">
          Coincidieron en una ronda de RONDA. Todo contacto pasa por acá: si algo no se siente bien, reportalo.
        </div>
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[78%] rounded-3xl px-4 py-3 text-sm leading-relaxed sm:max-w-[65%]",
                m.mine
                  ? "rounded-br-lg bg-primary text-primary-foreground"
                  : "rounded-bl-lg bg-surface border border-border"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {messages.length === 0 && loaded && (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            Escribí el primer mensaje. Las mejores charlas arrancan así de simple.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/60 bg-background/85 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Escribirle a ${p.name}…`}
            maxLength={1000}
            className="flex-1 rounded-full border border-input bg-surface px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground/60"
            aria-label="Escribir mensaje"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40"
            aria-label="Enviar mensaje"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
