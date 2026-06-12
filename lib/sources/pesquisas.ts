// Fonte REAL de pesquisas presidenciais 2026 — vem da Wikipédia, parseada pelo
// sidecar (/pesquisas, pandas.read_html). Sem credencial, sem entrada manual.
// Expõe a % mais recente e a tendência por candidato (Lula/Flávio/Caiado/Zema/
// Renan) para o "vento nacional" e a página Cenário.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SIDECAR_BASE = (process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment").replace(
  /\/sentiment$/,
  "",
);
const TTL_MS = 6 * 60 * 60 * 1000; // pesquisas saem em lotes — 6h basta
const FETCH_TIMEOUT_MS = 25_000;
const CACHE_FILE = join(process.cwd(), "data", "pesquisas-cache.json");

export type Pesquisa = {
  instituto: string;
  data: string;
  lula: number | null;
  flavio: number | null;
  caiado: number | null;
  zema: number | null;
  renan: number | null;
};
export type CandKey = "lula" | "flavio" | "caiado" | "zema" | "renan";
const CANDS: CandKey[] = ["lula", "flavio", "caiado", "zema", "renan"];

let cache: { at: number; pesquisas: Pesquisa[] } = { at: 0, pesquisas: [] };
let inFlight = false;

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (Array.isArray(raw.pesquisas)) cache = { at: 0, pesquisas: raw.pesquisas };
  } catch {
    /* primeira execução */
  }
})();

/** Lista das últimas pesquisas (mais recente primeiro). [] = sem dado. */
export function getPesquisas(): Pesquisa[] {
  return cache.pesquisas;
}

/** Fonte da pesquisa mais recente (instituto + data). */
export function getFontePesquisa(): { instituto: string; data: string } | null {
  const p = cache.pesquisas[0];
  return p ? { instituto: p.instituto, data: p.data } : null;
}

/** Por candidato: % na pesquisa mais recente + tendência vs as anteriores. */
export function getPresidencial(): Record<CandKey, { pct: number; dir: "up" | "down" | "flat" }> | null {
  if (!cache.pesquisas.length) return null;
  const recente = cache.pesquisas[0];
  const anteriores = cache.pesquisas.slice(1, 4);
  const out = {} as Record<CandKey, { pct: number; dir: "up" | "down" | "flat" }>;
  for (const c of CANDS) {
    const atual = recente[c];
    if (typeof atual !== "number") continue;
    const passados = anteriores.map((p) => p[c]).filter((v): v is number => typeof v === "number");
    const media = passados.length ? passados.reduce((s, v) => s + v, 0) / passados.length : atual;
    const dir = atual > media + 1 ? "up" : atual < media - 1 ? "down" : "flat";
    out[c] = { pct: atual, dir };
  }
  return Object.keys(out).length ? out : null;
}

/** Dispara o refresh se venceu. Não bloqueia. */
export function ensureFreshPesquisas(): void {
  if (inFlight) return;
  if (Date.now() - cache.at < TTL_MS && cache.pesquisas.length) return;
  inFlight = true;
  void refresh().finally(() => {
    inFlight = false;
  });
}

async function refresh(): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${SIDECAR_BASE}/pesquisas`, { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as { pesquisas?: Pesquisa[] };
      if (Array.isArray(json.pesquisas) && json.pesquisas.length) {
        cache = { at: Date.now(), pesquisas: json.pesquisas };
        try {
          writeFileSync(CACHE_FILE, `${JSON.stringify({ pesquisas: cache.pesquisas })}\n`);
        } catch {
          /* FS read-only */
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* sidecar/rede indisponível — mantém o último bom */
  }
}
