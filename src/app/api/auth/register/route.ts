import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, toPublicUser } from "@/lib/auth";

export const runtime = "nodejs";

// Registro del MVP: sin email real (se genera uno interno).
// Google/TikTok llegarán por OAuth real en una versión futura;
// este endpoint NUNCA simula autenticación de terceros.

function pseudoEmail(name: string): string {
  const base = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "").slice(0, 12) || "user";
  return `${base}.${Date.now().toString(36)}@ronda.local`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, age, city, gender, lookingFor, preference, interests, photoUrl, acceptTerms, acceptAge } = body ?? {};

    // Validaciones servidor
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 40) {
      return NextResponse.json({ error: "El nombre debe tener entre 2 y 40 caracteres" }, { status: 400 });
    }
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 99) {
      return NextResponse.json({ error: "RONDA es exclusivamente para mayores de 18 años" }, { status: 400 });
    }
    if (typeof city !== "string" || city.trim().length < 2) {
      return NextResponse.json({ error: "Ingresá tu ciudad" }, { status: 400 });
    }
    if (!["FEMALE", "MALE", "NON_BINARY"].includes(gender)) {
      return NextResponse.json({ error: "Género inválido" }, { status: 400 });
    }
    if (!["RELATIONSHIP", "MEET_PEOPLE", "FRIENDSHIP"].includes(lookingFor)) {
      return NextResponse.json({ error: "Qué buscás es obligatorio" }, { status: 400 });
    }
    if (!["WOMEN", "MEN", "EVERYONE"].includes(preference)) {
      return NextResponse.json({ error: "Preferencia inválida" }, { status: 400 });
    }
    if (acceptTerms !== true || acceptAge !== true) {
      return NextResponse.json({ error: "Necesitamos que aceptes los términos y confirmes tu edad" }, { status: 400 });
    }

    const interestsJson = JSON.stringify(Array.isArray(interests) ? interests.filter((i: unknown) => typeof i === "string").slice(0, 12) : []);
    const cleanPhoto = typeof photoUrl === "string" && photoUrl.startsWith("/api/media/photos/") ? photoUrl : null;

    const user = await db.user.create({
      data: {
        email: pseudoEmail(name),
        name: name.trim(),
        age: ageNum,
        city: city.trim(),
        gender,
        lookingFor,
        preference,
        interests: interestsJson,
        photoUrl: cleanPhoto,
        status: "AVAILABLE",
        provider: "email",
        isDemo: false,
      },
    });

    await createSession(user.id);
    return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No pudimos crear tu perfil. Intentá de nuevo." }, { status: 500 });
  }
}
