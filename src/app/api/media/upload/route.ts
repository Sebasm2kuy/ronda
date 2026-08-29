import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { saveUpload, isMediaKind } from "@/lib/media";

export const runtime = "nodejs";

// Subida de foto de perfil o video de presentación.
// El video SIEMPRE se sube como grabación directa (MediaRecorder);
// no se permite elegir archivos desde el disco como "presentación".

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const form = await req.formData();
    const kind = String(form.get("kind") ?? "");
    const file = form.get("file");

    if (!isMediaKind(kind)) {
      return NextResponse.json({ error: "Tipo de archivo inválido" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    }

    const url = await saveUpload(file, kind);
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al subir el archivo";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
