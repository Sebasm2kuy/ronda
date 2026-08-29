import type { NextConfig } from "next";

// RONDA tiene dos modos de build:
// - NEXT_EXPORT=1 → export estático (GitHub Pages): sin servidor, todo en el cliente.
// - default → servidor standalone (VPS / preview del entorno).
const isExport = process.env.NEXT_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const base: Partial<NextConfig> = {
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};

const nextConfig: NextConfig = isExport
  ? {
      ...base,
      output: "export",
      basePath,
      trailingSlash: true,
      images: { unoptimized: true },
      env: { NEXT_PUBLIC_BASE_PATH: basePath },
    }
  : {
      ...base,
      output: "standalone",
    };

export default nextConfig;
