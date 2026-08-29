"use client";

// ============================================================
// RONDA — Motor de Conversación Adaptativo
// conversation-host.tsx — capa de UI del motor (spec §25).
//
// - Tarjetas pequeñas y elegantes que NO interrumpen el video.
// - Desaparecen fácilmente (botón X o Responder).
// - El silencio se maneja con CONSENTIMIENTO: "¿Les tiro una
//   pregunta? 👀" con [Sí] / [Seguimos hablando] (spec §12).
// - Marcadores discretos de último minuto y 30 segundos (§18).
// - Composer mínimo para "decir algo" en la ronda demo: es la
//   forma en que el usuario alimenta el motor con lo suyo.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, X, Users, Flame, Dice5, Lightbulb, ArrowDownUp,
  MessageCircle, SendHorizonal, MessageSquarePlus,
} from "lucide-react";
import { ConversationEngine } from "@/lib/conversation/engine";
import { PersonaSimulator } from "@/lib/conversation/demo/persona";
import { persistRoundMetrics, saveRoundSummary } from "@/lib/conversation/metrics-client";
import type { EngineParticipant, Intervention, InterventionType } from "@/lib/conversation/types";
import { ROUND_SECONDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ConversationHostProps {
  roundId: string;
  partner: EngineParticipant;
  me: EngineParticipant | null;
  callPhase: "loading" | "connecting" | "live" | "ending";
  secondsLeft: number;
}

interface Caption {
  id: string;
  speaker: "A" | "B";
  name: string;
  text: string;
}

const TYPE_META: Record<InterventionType, { label: string; icon: typeof Sparkles }> = {
  QUESTION: { label: "PARA USTEDES", icon: Sparkles },
  QUESTION_BOTH: { label: "PARA LOS DOS", icon: Users },
  CHALLENGE: { label: "DESAFÍO", icon: Flame },
  CHOICE: { label: "ELECCIÓN", icon: ArrowDownUp },
  HYPOTHETICAL: { label: "HIPOTÉTICO", icon: Lightbulb },
  GAME: { label: "JUEGO", icon: Dice5 },
  DEEPENING: { label: "PARA PROFUNDIZAR", icon: MessageCircle },
};

let captionSeq = 0;

export default function ConversationHost({ roundId, partner, me, callPhase, secondsLeft }: ConversationHostProps) {
  const engineRef = useRef<ConversationEngine | null>(null);
  const personaRef = useRef<PersonaSimulator | null>(null);
  const disposedRef = useRef(false);

  const [captions, setCaptions] = useState<Caption[]>([]);
  const [card, setCard] = useState<Intervention | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [marker, setMarker] = useState<string | null>(null);

  const elapsed = ROUND_SECONDS - secondsLeft;
  const myName = me?.name.split(" ")[0] ?? "Vos";

  // ---------------------------------------------------------- ciclo de vida
  useEffect(() => {
    if (callPhase !== "live" || engineRef.current) return;
    disposedRef.current = false;

    const engine = new ConversationEngine({
      me: me ?? { name: "Vos", interests: [] },
      partner,
    });
    engineRef.current = engine;
    engine.start();

    engine.on("intervention", (i) => {
      setCard(i);
      // La pareja demo escucha la tarjeta y responde con su personalidad.
      personaRef.current?.onIntervention(i);
    });
    engine.on("proposal", () => setProposalOpen(true));
    engine.on("safety", ({ speaker }) => {
      toast.error(
        speaker === "A"
          ? "Preferimos una ronda respetuosa. Si algo no te gusta, podés reportar o bloquear."
          : "Detectamos una señal incómoda. Podés reportar o bloquear cuando quieras."
      );
    });

    const persona = new PersonaSimulator(
      { name: partner.name, interests: partner.interests, bio: null },
      (text) => {
        if (disposedRef.current) return;
        pushCaption("B", partner.name, text);
        engine.addTurn("B", text);
      }
    );
    personaRef.current = persona;
    persona.greet(myName);

    return () => {
      // Al desmontar: cerrar el motor, persistir métricas best-effort
      // (solo si la ronda alcanzó a ser una conversación real).
      disposedRef.current = true;
      persona.dispose();
      const report = engine.end();
      if (report.elapsedS > 10) {
        void persistRoundMetrics(roundId, report);
        saveRoundSummary(roundId, {
          finalHealth: report.finalHealth,
          peakHealth: report.peakHealth,
          exchanges: report.exchanges,
          goodChat: report.finalHealth >= 60 || report.peakHealth >= 72,
        });
      }
      engineRef.current = null;
      personaRef.current = null;
    };
  }, [callPhase, roundId]);

  // Propuesta de silencio con timeout: si nadie la atiende, se retira
  // solita (sin backoff duro — ignorar no es rechazar).
  useEffect(() => {
    if (!proposalOpen) return;
    const t = setTimeout(() => {
      setProposalOpen((open) => {
        if (open) engineRef.current?.ignoreProposal();
        return false;
      });
    }, 18000);
    return () => clearTimeout(t);
  }, [proposalOpen]);

  // ---------------------------------------------------------- tick
  useEffect(() => {
    if (callPhase !== "live") return;
    engineRef.current?.tick(elapsed);
  }, [secondsLeft, elapsed, callPhase]);

  // ---------------------------------------------------------- marcadores de minuto (§18)
  useEffect(() => {
    if (callPhase !== "live") return;
    if (secondsLeft === 60) setMarker("⏳ Queda 1 minuto");
    else if (secondsLeft === 30) setMarker("Últimos 30 segundos 👀");
    else return;
    const t = setTimeout(() => setMarker(null), 5200);
    return () => clearTimeout(t);
  }, [secondsLeft, callPhase]);

  // ---------------------------------------------------------- captions
  const pushCaption = (speaker: "A" | "B", name: string, text: string) => {
    captionSeq++;
    const cap: Caption = { id: `c${captionSeq}`, speaker, name, text };
    setCaptions((prev) => [...prev.slice(-2), cap]);
    setTimeout(() => {
      setCaptions((prev) => prev.filter((c) => c.id !== cap.id));
    }, 14000);
  };

  // ---------------------------------------------------------- acciones
  const sendUserTurn = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !engineRef.current) return;
    pushCaption("A", "Vos", trimmed);
    const verdict = engineRef.current.addTurn("A", trimmed);
    // Si el Safety Filter marcó el turno, la persona no pica: se pide
    // reportar/bloquear y la conversación no se alimenta con eso.
    if (verdict.ok) personaRef.current?.onUserTurn(trimmed);
    setComposerText("");
    setComposerOpen(false);
    if (card) setCard(null); // respondió: la tarjeta ya cumplió su rol
  };

  const handleCardDismiss = () => {
    engineRef.current?.dismissCurrent();
    setCard(null);
  };

  const handleCardAnother = () => {
    engineRef.current?.requestAnother();
  };

  const handleCardRespond = () => {
    setComposerOpen(true);
  };

  const handleProposal = (accepted: boolean) => {
    setProposalOpen(false);
    if (accepted) engineRef.current?.acceptProposal();
    else engineRef.current?.declineProposal();
  };

  const cardMeta = useMemo(() => (card ? TYPE_META[card.type] : null), [card]);
  const CardIcon = cardMeta?.icon ?? Sparkles;

  if (callPhase !== "live") return null;

  return (
    <>
      {/* Marcador de minuto (discreto, arriba, no molesta) */}
      <AnimatePresence>
        {marker && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute left-1/2 top-24 z-10 -translate-x-1/2"
            role="status"
          >
            <span className="glass rounded-full px-4 py-1.5 text-xs font-medium text-foreground/90">
              {marker}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Columna de conversación: captions + propuesta + tarjeta + composer.
          Todo en un mismo stack flex para que nunca se pisen entre sí. */}
      <div
        className="absolute inset-x-3 bottom-[6.25rem] z-[9] flex max-h-[62vh] flex-col justify-end gap-2 sm:inset-x-0 sm:items-center"
        aria-live="polite"
      >
        {/* Captions (lo que se dicen) */}
        <div className="flex w-full max-w-sm flex-col gap-1.5 sm:px-4">
          <AnimatePresence initial={false}>
            {captions.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "flex flex-col",
                  c.speaker === "A" ? "items-end self-end" : "items-start self-start"
                )}
              >
                <span className="mb-0.5 px-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {c.speaker === "B" ? c.name : "Vos"}
                </span>
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug",
                    c.speaker === "B"
                      ? "glass rounded-bl-md text-foreground/95"
                      : "rounded-br-md border border-primary/25 bg-primary/12 text-foreground/95"
                  )}
                >
                  {c.text}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Propuesta con consentimiento (§12) */}
        <AnimatePresence>
          {proposalOpen && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              className="w-full max-w-sm sm:px-4"
              role="status"
            >
              <div className="glass mx-auto flex w-full max-w-xs flex-col gap-2.5 rounded-2xl px-4 py-3">
                <p className="text-center text-sm font-medium">¿Les tiro una pregunta? 👀</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleProposal(true)}
                    className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-black transition-transform hover:scale-105 active:scale-95"
                  >
                    Sí
                  </button>
                  <button
                    onClick={() => handleProposal(false)}
                    className="rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Seguimos hablando
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tarjeta de intervención (§25): chica, elegante, cerrable */}
        <AnimatePresence>
          {card && cardMeta && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
              className="w-full max-w-sm sm:px-4"
              role="status"
            >
              <div className="glass w-full rounded-3xl p-4 shadow-2xl shadow-black/50">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.25em] text-primary">
                    <CardIcon className="h-3.5 w-3.5" /> {cardMeta.label}
                  </span>
                  <button
                    onClick={handleCardDismiss}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                    aria-label="Cerrar tarjeta"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={card.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22 }}
                    className="font-display text-[15px] font-semibold leading-snug text-balance"
                  >
                    {card.text}
                  </motion.p>
                </AnimatePresence>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleCardRespond}
                    className="rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
                  >
                    Responder
                  </button>
                  <button
                    onClick={handleCardAnother}
                    className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Otra
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Composer: cómo el usuario "habla" en la ronda demo */}
        <div className="w-full max-w-sm sm:px-4">
          <AnimatePresence mode="wait">
            {composerOpen ? (
              <motion.form
                key="composer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  sendUserTurn(composerText);
                }}
                className="glass flex w-full items-center gap-2 rounded-full p-1.5 pl-4"
              >
                <input
                  autoFocus
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Decí algo…"
                  aria-label="Escribir mensaje"
                  maxLength={240}
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-black transition-transform hover:scale-105 active:scale-95"
                  aria-label="Enviar mensaje"
                >
                  <SendHorizonal className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Cerrar composer"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.form>
            ) : (
              <motion.button
                key="composer-pill"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
                onClick={() => setComposerOpen(true)}
                className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" /> Decir algo…
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
