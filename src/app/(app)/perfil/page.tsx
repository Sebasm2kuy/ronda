"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, LogOut, MapPin, RefreshCw, ShieldCheck, Video, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost } from "@/lib/client";
import { saveMediaBlob } from "@/lib/browser-api";
import type { PublicUser } from "@/lib/types";
import { labelFor, LOOKING_FOR, PREFERENCES, GENDERS } from "@/lib/constants";

export default function PerfilPage() {
  const router = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGet<{ user: PublicUser | null }>("/api/auth/session").then((d) => {
      if (!d.user) {
        router.replace("/");
        return;
      }
      setMe(d.user);
      setLoaded(true);
    });
  }, [router]);

  const changePhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const url = await saveMediaBlob(file, "photos");
      const d = await apiPatch<{ user: PublicUser }>("/api/users/me", { photoUrl: url });
      setMe(d.user);
      toast.success("Foto actualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pudimos subir la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const logout = async () => {
    await apiPost("/api/auth/logout").catch(() => {});
    router.replace("/");
  };

  if (!loaded || !me) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      {/* Encabezado del perfil */}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="h-28 w-28 overflow-hidden rounded-[2rem] border border-border shadow-xl">
            {me.photoUrl ? (
               
              <img src={me.photoUrl} alt={`Foto de ${me.name}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary font-display text-4xl font-bold text-muted-foreground">
                {me.name[0]}
              </div>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
            aria-label="Cambiar foto de perfil"
          >
            {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) changePhoto(f);
            }}
          />
        </div>

        <h1 className="mt-5 font-display text-3xl font-bold">
          {me.name}, {me.age}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" /> {me.city}
        </p>
        {me.provider === "email" && (
          <span className="mt-3 rounded-full border border-border bg-secondary/50 px-3 py-1 text-[11px] text-muted-foreground">
            Cuenta directa · Google y TikTok disponibles próximamente
          </span>
        )}
      </div>

      {/* Video de presentación */}
      <section className="mt-9">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Tu presentación</h2>
          <Link
            href="/onboarding/video"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs transition-colors hover:border-primary/50 hover:text-primary"
          >
            <RefreshCw className="h-3 w-3" /> {me.videoUrl ? "Regrabar" : "Grabar ahora"}
          </Link>
        </div>
        <div className="relative overflow-hidden rounded-[1.8rem] border border-border bg-black">
          {me.videoUrl ? (
            <video
              src={me.videoUrl}
              controls
              playsInline
              className="aspect-[3/4] w-full object-cover sm:aspect-video"
              aria-label="Tu video de presentación"
            />
          ) : (
            <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 bg-surface/60 text-muted-foreground sm:aspect-video">
              <Video className="h-8 w-8" />
              <p className="max-w-[240px] text-center text-sm leading-relaxed">
                Todavía no grabaste tu presentación de 30 segundos. Es lo primero que van a ver de vos.
              </p>
              <Link href="/onboarding/video" className="btn-ronda !min-h-0 !py-2.5 !px-5 text-sm">
                GRABAR MI PRESENTACIÓN
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Datos */}
      <section className="mt-8 space-y-3">
        <div className="rounded-3xl border border-border bg-surface/60 p-5">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground mb-1">QUÉ BUSCÁS</p>
          <p className="font-display text-lg font-semibold">{labelFor(me.lookingFor, LOOKING_FOR)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Género</p>
              <p className="font-medium">{labelFor(me.gender, GENDERS)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Querés conocer</p>
              <p className="font-medium">{labelFor(me.preference, PREFERENCES)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface/60 p-5">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground mb-3">INTERESES</p>
          <div className="flex flex-wrap gap-2">
            {me.interests.length > 0 ? (
              me.interests.map((i) => (
                <span key={i} className="rounded-full border border-border bg-secondary/50 px-3.5 py-1.5 text-sm">
                  {i}
                </span>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Todavía no elegiste intereses.</p>
            )}
          </div>
        </div>
      </section>

      {/* Seguridad y cuenta */}
      <section className="mt-8 space-y-2">
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> SEGURIDAD Y CUENTA
        </p>
        <Link href="/terminos" className="flex items-center justify-between rounded-2xl border border-border bg-surface/50 px-5 py-4 text-sm transition-colors hover:border-foreground/20">
          Términos y condiciones
        </Link>
        <Link href="/privacidad" className="flex items-center justify-between rounded-2xl border border-border bg-surface/50 px-5 py-4 text-sm transition-colors hover:border-foreground/20">
          Política de privacidad
        </Link>
        <button
          onClick={logout}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface/50 px-5 py-4 text-sm text-destructive transition-colors hover:border-destructive/40"
        >
          Cerrar sesión <LogOut className="h-4 w-4" />
        </button>
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        RONDA · exclusivo para mayores de 18 años
      </p>
    </div>
  );
}
