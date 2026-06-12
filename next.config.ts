import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { NextConfig } from "next";

// Versão exibida no header (diagnóstico de cache no aparelho). O "major" é
// manual; o "minor" sobe sozinho a cada build via scripts/bump-version.mjs
// (contador em data/build-counter.json, fora do git). Ex.: v4.1, v4.2, v4.3…
const APP_MAJOR = 4;
function buildMinor(): number {
  try {
    const minor = JSON.parse(
      readFileSync(join(process.cwd(), "data", "build-counter.json"), "utf8"),
    ).minor;
    return Number.isFinite(minor) ? minor : 0;
  } catch {
    return 0;
  }
}
const APP_VERSION = `v${APP_MAJOR}.${buildMinor()}`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
  },
  serverExternalPackages: ["@remotion/renderer"],
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: process.cwd(),
  },
  // Páginas de marketing estáticas (servidas de public/) com URL limpa.
  async rewrites() {
    return [
      { source: "/cta", destination: "/cta.html" },
      { source: "/info", destination: "/info.html" },
    ];
  },
  // Não cachear o HTML das páginas do app (os chunks /_next/static seguem
  // imutáveis/hasheados). Garante que cada deploy chegue ao usuário no reload.
  async headers() {
    const noStore = [
      { key: "Cache-Control", value: "no-store, must-revalidate" },
    ];
    return [
      { source: "/", headers: noStore },
      { source: "/log", headers: noStore },
      { source: "/cadastrados", headers: noStore },
      { source: "/mapa", headers: noStore },
      { source: "/m", headers: noStore },
      { source: "/m/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
