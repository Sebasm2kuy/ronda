"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ImageIcon, Info, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiPost, ApiError } from "@/lib/client";
import { GENDERS, LOOKING_FOR, PREFERENCES, INTEREST_OPTIONS, labelFor } from "@/lib/constants";
import { RondaMark } from "@/components/shell/app-shell";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FormState {
  name: string;
  age: string;
  city: string;
  gender: string;
  lookingFor: string;
  preference: string;
  interests: string[];
  photoUrl: string | null;
  acceptTerms: boolean;
  acceptAge: boolean;
}

const TOTAL_STEPS = 5;

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [oauthDialog, setOauthDialog] = useState<"google" | "tiktok" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    age: "",
    city: "",
    gender: "",
    lookingFor: "",
    preference: "",
    interests: [],
    photoUrl: null,
    acceptTerms: false,
    acceptAge: false,
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const ageNum = parseInt(form.age, 10);
  const ageValid = Number.isInteger(ageNum) && ageNum >= 18 && ageNum <= 99;

  const canContinue = (): boolean => {
    switch (step) {
      case 0:
        return form.name.trim().length >= 2 && ageValid && form.city.trim().length >= 2;
      case 1:
        return form.gender !== "" && form.lookingFor !== "" && form.preference !== "";
      case 2:
        return form.interests.length >= 1;
      case 3:
        return true; // foto opcional
      case 4:
        return form.acceptTerms && form.acceptAge;
      default:
        return false;
    }
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("kind", "photos");
      fd.append("file", file);
      // Registro aún no crea sesión: el servidor exige login para subir.
      // Guardamos la foto localmente (data URL) y la subimos tras crear la cuenta.
      if (file.size > 8 * 1024 * 1024) throw new Error("La foto pesa más de 8MB");
      const reader = new FileReader();
      reader.onload = () => set("photoUrl", reader.result as string);
      reader.readAsDataURL(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pudimos leer la foto");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      // Si eligió foto local, subirla primero con sesión creada
      await apiPost("/api/auth/register", {
        name: form.name.trim(),
        age: ageNum,
        city: form.city.trim(),
        gender: form.gender,
        lookingFor: form.lookingFor,
        preference: form.preference,
        interests: form.interests,
        photoUrl: null,
        acceptTerms: form.acceptTerms,
        acceptAge: form.acceptAge,
      });

      // Subir foto ahora que hay sesión
      if (form.photoUrl?.startsWith("data:")) {
        const blob = await (await fetch(form.photoUrl)).blob();
        const fd = new FormData();
        fd.append("kind", "photos");
        fd.append("file", new File([blob], "perfil.jpg", { type: blob.type || "image/jpeg" }));
        const res = await fetch("/api/media/upload", { method: "POST", body: fd });
        if (res.ok) {
          const { url } = await res.json();
          await fetch("/api/users/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoUrl: url }),
          });
        }
      }

      toast.success("¡Perfil creado! Ahora te toca a vos.");
      router.replace("/onboarding/video");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No pudimos crear tu perfil");
      setSubmitting(false);
    }
  };

  const next = () => (step === TOTAL_STEPS - 1 ? submit() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="relative min-h-screen grain">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-5 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <div className="flex items-center gap-2">
            <RondaMark size={24} />
            <span className="font-display text-sm font-bold tracking-[0.2em]">RONDA</span>
          </div>
        </div>

        {/* Progreso */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Paso {step + 1} de {TOTAL_STEPS}</span>
            <span>{Math.round(((step + 1) / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-deep via-primary to-rose"
              animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex-1"
          >
            {/* Paso 0: datos básicos */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl font-bold text-balance">Empecemos por lo esencial</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Solo lo justo para presentarte bien.</p>
                </div>
                <Field label="Tu nombre">
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Cómo te gusta que te llamen"
                    maxLength={40}
                    className="w-full rounded-2xl border border-input bg-surface px-4 py-4 text-base outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground/60"
                    autoComplete="given-name"
                  />
                </Field>
                <Field label="Tu edad" hint="RONDA es exclusivamente para mayores de 18 años">
                  <input
                    value={form.age}
                    onChange={(e) => set("age", e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="Por ejemplo: 34"
                    inputMode="numeric"
                    className={cn(
                      "w-full rounded-2xl border bg-surface px-4 py-4 text-base outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground/60",
                      form.age === "" || ageValid ? "border-input" : "border-destructive/60"
                    )}
                  />
                  {form.age !== "" && !ageValid && (
                    <p className="mt-2 text-xs text-destructive">Necesitamos una edad entre 18 y 99.</p>
                  )}
                </Field>
                <Field label="Tu ciudad">
                  <input
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Montevideo, Canelones…"
                    maxLength={60}
                    className="w-full rounded-2xl border border-input bg-surface px-4 py-4 text-base outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground/60"
                  />
                </Field>
              </div>
            )}

            {/* Paso 1: identidad y búsqueda */}
            {step === 1 && (
              <div className="space-y-7">
                <div>
                  <h1 className="font-display text-3xl font-bold text-balance">¿Quién sos y qué buscás?</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Esto ayuda a que las rondas tengan sentido.</p>
                </div>
                <Field label="Género">
                  <div className="grid grid-cols-3 gap-2">
                    {GENDERS.map((g) => (
                      <OptionChip key={g.value} active={form.gender === g.value} onClick={() => set("gender", g.value)}>
                        {g.label}
                      </OptionChip>
                    ))}
                  </div>
                </Field>
                <Field label="¿Qué buscás?">
                  <div className="space-y-2">
                    {LOOKING_FOR.map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        onClick={() => set("lookingFor", l.value)}
                        className={cn(
                          "w-full rounded-2xl border px-5 py-4 text-left transition-all",
                          form.lookingFor === l.value
                            ? "border-primary bg-primary/10"
                            : "border-border bg-surface hover:border-foreground/20"
                        )}
                      >
                        <span className="block font-medium">{l.label}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{l.hint}</span>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Querés conocer a">
                  <div className="grid grid-cols-3 gap-2">
                    {PREFERENCES.map((p) => (
                      <OptionChip key={p.value} active={form.preference === p.value} onClick={() => set("preference", p.value)}>
                        {p.label}
                      </OptionChip>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {/* Paso 2: intereses */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl font-bold text-balance">¿De qué te gusta hablar?</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Elegí al menos uno. Van a servir para futuras rondas y eventos.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((i) => {
                    const active = form.interests.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          set(
                            "interests",
                            active ? form.interests.filter((x) => x !== i) : [...form.interests, i].slice(0, 12)
                          )
                        }
                        className={cn(
                          "rounded-full border px-4 py-2.5 text-sm transition-all",
                          active
                            ? "border-primary bg-primary/12 text-primary"
                            : "border-border bg-surface text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                        )}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{form.interests.length}/12 seleccionados</p>
              </div>
            )}

            {/* Paso 3: foto */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl font-bold text-balance">Una foto tuya, real</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Acá todo se conoce de verdad: tu video será lo principal, pero la foto ayuda a encontrarte.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative h-44 w-36 overflow-hidden rounded-3xl border border-border bg-surface">
                    {form.photoUrl ? (
                       
                      <img src={form.photoUrl} alt="Vista previa de tu foto de perfil" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-7 w-7" />
                        <span className="text-xs">Sin foto aún</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPhoto(f);
                    }}
                  />
                  <div className="flex gap-2">
                    <button type="button" className="btn-ghost !py-3 !min-h-0" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      Elegir foto
                    </button>
                    {form.photoUrl && (
                      <button
                        type="button"
                        className="btn-ghost !py-3 !min-h-0 text-destructive"
                        onClick={() => set("photoUrl", null)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Quitar
                      </button>
                    )}
                  </div>
                  <p className="text-center text-xs text-muted-foreground">Opcional. Podés agregarla después desde tu perfil.</p>
                </div>
              </div>
            )}

            {/* Paso 4: confirmaciones */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl font-bold text-balance">Última cosa antes de tu presentación</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Todo claro, sin letra chica escondida.</p>
                </div>
                <div className="glass rounded-3xl p-5 text-sm space-y-2">
                  <p><span className="text-muted-foreground">Nombre:</span> <strong>{form.name}</strong></p>
                  <p><span className="text-muted-foreground">Edad:</span> <strong>{ageNum}</strong> · <span className="text-muted-foreground">Ciudad:</span> <strong>{form.city}</strong></p>
                  <p><span className="text-muted-foreground">Buscás:</span> <strong>{labelFor(form.lookingFor, LOOKING_FOR)}</strong></p>
                  <p><span className="text-muted-foreground">Querés conocer:</span> <strong>{labelFor(form.preference, PREFERENCES)}</strong></p>
                  <p className="text-muted-foreground text-xs pt-1">Intereses: {form.interests.join(", ") || "—"}</p>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface p-4">
                  <input
                    type="checkbox"
                    checked={form.acceptAge}
                    onChange={(e) => set("acceptAge", e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded accent-[#f0b429]"
                  />
                  <span className="text-sm">
                    Confirmo que tengo <strong>18 años o más</strong>. RONDA es exclusivamente para personas adultas.
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface p-4">
                  <input
                    type="checkbox"
                    checked={form.acceptTerms}
                    onChange={(e) => set("acceptTerms", e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded accent-[#f0b429]"
                  />
                  <span className="text-sm">
                    Acepto los{" "}
                    <Link href="/terminos" target="_blank" className="text-primary underline underline-offset-2">términos y condiciones</Link>{" "}
                    y la{" "}
                    <Link href="/privacidad" target="_blank" className="text-primary underline underline-offset-2">política de privacidad</Link>.
                  </span>
                </label>
                <div className="flex items-start gap-2 rounded-2xl bg-secondary/50 p-4 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  En este MVP el registro es directo. La entrada con Google y TikTok se habilitará en próximas versiones con OAuth real.
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Botones OAuth solo en el primer paso */}
        {step === 0 && (
          <div className="mt-8 space-y-2">
            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <span className="relative bg-background px-3 text-xs text-muted-foreground">o creá tu cuenta en un minuto</span>
            </div>
            <button type="button" onClick={() => setOauthDialog("google")} className="btn-ghost w-full">
              <GoogleIcon /> Continuar con Google
            </button>
            <button type="button" onClick={() => setOauthDialog("tiktok")} className="btn-ghost w-full">
              <TikTokIcon /> Continuar con TikTok
            </button>
          </div>
        )}

        {/* Navegación */}
        <div className="sticky bottom-0 mt-8 flex gap-3 bg-gradient-to-t from-background via-background pt-4 pb-2">
          {step > 0 && (
            <button type="button" onClick={back} className="btn-ghost flex-1" disabled={submitting}>
              <ArrowLeft className="h-4 w-4" /> Atrás
            </button>
          )}
          <button type="button" onClick={next} className="btn-ronda flex-[2]" disabled={!canContinue() || submitting}>
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : step === TOTAL_STEPS - 1 ? (
              <>CREAR MI PERFIL <Check className="h-4 w-4" /></>
            ) : (
              <>CONTINUAR <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </div>
      </div>

      {/* Diálogo OAuth: nunca simula autenticación real */}
      <Dialog open={oauthDialog !== null} onOpenChange={(o) => !o && setOauthDialog(null)}>
        <DialogContent className="max-w-sm rounded-3xl bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Disponible próximamente
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-1">
              Entrar con {oauthDialog === "google" ? "Google" : "TikTok"} estará listo en una próxima versión
              (OAuth real, no simulado). Por ahora creá tu perfil en un minuto, directamente.
            </DialogDescription>
          </DialogHeader>
          <button className="btn-ronda w-full" onClick={() => setOauthDialog(null)}>
            CREAR MI PERFIL
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-2 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function OptionChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-3 py-3.5 text-sm font-medium transition-all text-center",
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:border-foreground/20"
      )}
    >
      {children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}
