// Rutas de assets públicos con soporte de basePath (GitHub Pages sirve
// el sitio bajo /ronda). Los <img>/<video> con src absolutos no reciben
// el prefijo automáticamente: por eso todo dato demo pasa por assetUrl.

export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function assetUrl(path: string): string {
  if (!path || !path.startsWith("/")) return path;
  return `${BASE_PATH}${path}`;
}
