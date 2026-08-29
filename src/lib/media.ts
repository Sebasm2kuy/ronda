// Gestión de archivos subidos (fotos de perfil y videos de presentación).
// Se guardan fuera de /public y se sirven vía /api/media/[kind]/[file]
// para funcionar correctamente en desarrollo y producción.

import { mkdir, writeFile, stat } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { Readable } from "stream";

export const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? "/home/z/my-project/uploads";

export const MEDIA_KINDS = {
  photos: { dir: "photos", maxBytes: 8 * 1024 * 1024, exts: [".jpg", ".jpeg", ".png", ".webp"], mimePrefix: "image/" },
  videos: { dir: "videos", maxBytes: 40 * 1024 * 1024, exts: [".webm", ".mp4", ".ogg", ".mov"], mimePrefix: "video/" },
} as const;

export type MediaKind = keyof typeof MEDIA_KINDS;

export function isMediaKind(kind: string): kind is MediaKind {
  return kind === "photos" || kind === "videos";
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/webm": ".webm",
  "video/mp4": ".mp4",
  "video/ogg": ".ogg",
  "video/quicktime": ".mov",
};

export async function saveUpload(file: File, kind: MediaKind): Promise<string> {
  const conf = MEDIA_KINDS[kind];
  if (file.size > conf.maxBytes) {
    throw new Error(`Archivo demasiado grande (máx ${Math.round(conf.maxBytes / 1024 / 1024)}MB)`);
  }
  const ext = EXT_BY_MIME[file.type] ?? (kind === "photos" ? ".jpg" : ".webm");
  if (!conf.exts.includes(ext)) {
    throw new Error("Formato no soportado");
  }
  const dir = path.join(UPLOAD_ROOT, conf.dir);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}${randomBytes(6).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);
  return `/api/media/${kind}/${name}`;
}

export function mimeForFile(kind: MediaKind, filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
    ".webm": "video/webm", ".mp4": "video/mp4", ".ogg": "video/ogg", ".mov": "video/quicktime",
  };
  return map[ext] ?? (kind === "photos" ? "application/octet-stream" : "application/octet-stream");
}

export function resolveMediaPath(kind: MediaKind, filename: string): string | null {
  // Evita path traversal: solo nombres simples
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return null;
  const dir = path.join(UPLOAD_ROOT, MEDIA_KINDS[kind].dir);
  const full = path.join(dir, filename);
  if (!full.startsWith(dir)) return null;
  return full;
}

/** Sirve un archivo con soporte básico de Range (necesario para <video>). */
export async function serveMedia(fullPath: string, kind: MediaKind, rangeHeader: string | null): Promise<Response> {
  const info = await stat(fullPath);
  const mime = mimeForFile(kind, path.basename(fullPath));
  const size = info.size;

  if (rangeHeader && /^bytes=\d*-\d*$/.test(rangeHeader)) {
    const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-");
    const start = parseInt(startStr || "0", 10);
    const end = endStr ? Math.min(parseInt(endStr, 10), size - 1) : size - 1;
    if (start <= end && start < size) {
      const { createReadStream } = await import("fs");
      const stream = createReadStream(fullPath, { start, end });
      const body = Readable.toWeb(stream) as ReadableStream;
      return new Response(body, {
        status: 206,
        headers: {
          "Content-Type": mime,
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(end - start + 1),
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  }

  const { createReadStream } = await import("fs");
  const body = Readable.toWeb(createReadStream(fullPath)) as ReadableStream;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
