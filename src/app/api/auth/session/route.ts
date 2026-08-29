import { NextResponse } from "next/server";
import { getCurrentUser, toPublicUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: toPublicUser(user) });
}
