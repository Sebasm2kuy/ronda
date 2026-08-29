import { NextRequest, NextResponse } from "next/server";
import { isMediaKind, resolveMediaPath, serveMedia } from "@/lib/media";

export const runtime = "nodejs";

type Params = { params: Promise<{ kind: string; file: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { kind, file } = await params;
  if (!isMediaKind(kind)) return new Response("Not found", { status: 404 });
  const full = resolveMediaPath(kind, file);
  if (!full) return new Response("Not found", { status: 404 });
  try {
    return await serveMedia(full, kind, req.headers.get("range"));
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
