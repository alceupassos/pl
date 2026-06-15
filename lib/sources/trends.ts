// Fonte REAL de buzz de busca — Google Trends via pytrends no sidecar local.
// Alimenta idx.sost.breakdown.mencoes e o índice por candidato (lib/index-real.ts).
//
// pytrends é fortemente rate-limited pelo Google: por isso buscamos UM termo por
// vez, com espaçamento mínimo entre requisições (fila round-robin) e TTL longo.
// O valor real de cada candidato "preenche" conforme a fila cicla; até o 1º
// sucesso o getter devolve null (célula "—" / indisponível no índice).
//
// NOTA: menções também podem vir do BrightData no futuro (já há chave no .env e
// gateways em sidecar/sentiment/social_gateways.py). O índice (lib/index-real.ts)
// consome getMencoesRealFor(); basta uma fonte BrightData preencher o mesmo cache.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { getPrincipalTermo } from "@/lib/sources/google-news";

const SIDECAR_BASE = (process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment").replace(
  /\/sentiment$/,
  "",
);
const TTL_MS = 6 * 60 * 60 * 1000;
const MIN_GAP_MS = 30_000; // espaçamento entre fetches p/ não tomar 429 do pytrends
const FETCH_TIMEOUT_MS = 25_000;
const CACHE_FILE = join(process.cwd(), "data", "trends-cache.json");

type State = { at: number; indice: number | null };
const byTermo = new Map<string, State>();
const queue: string[] = [];
const queued = new Set<string>();
let inFlight = false;
let lastFetchAt = 0;

function st(termo: string): State {
  let s = byTermo.get(termo);
  if (!s) {
    s = { at: 0, indice: null };
    byTermo.set(termo, s);
  }
  return s;
}

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && typeof raw.termos === "object" && raw.termos) {
      for (const [termo, v] of Object.entries(raw.termos)) {
        if (typeof v === "number" && Number.isFinite(v)) st(termo).indice = v; // at=0 força refresh
      }
    } else if (raw && typeof raw.indice === "number") {
      // formato antigo (1 termo) — herda como o termo padrão do principal
      st("Sóstenes Cavalcante").indice = raw.indice;
    }
  } catch {
    /* primeira execução */
  }
})();

/** Índice de menções/buzz (~100) do candidato. null = sem dado real ainda. */
export function getMencoesRealFor(termo: string): number | null {
  return byTermo.get(termo)?.indice ?? null;
}
export function hasMencoesRealFor(termo: string): boolean {
  return (byTermo.get(termo)?.indice ?? null) !== null;
}

/** Enfileira o termo para refresh (se vencido) e bombeia a fila. Não bloqueia. */
export function ensureFreshTrendsFor(termo: string): void {
  if (!termo) return;
  const s = st(termo);
  const stale = Date.now() - s.at >= TTL_MS || s.indice === null;
  if (stale && !queued.has(termo)) {
    queued.add(termo);
    queue.push(termo);
  }
  pump();
}

export function ensureFreshTrendsAll(termos: string[]): void {
  for (const termo of termos) ensureFreshTrendsFor(termo);
}

function pump(): void {
  if (inFlight || queue.length === 0) return;
  if (Date.now() - lastFetchAt < MIN_GAP_MS) return;
  const termo = queue.shift()!;
  queued.delete(termo);
  inFlight = true;
  void refresh(termo).finally(() => {
    inFlight = false;
    lastFetchAt = Date.now();
    pump();
  });
}

async function refresh(termo: string): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const url = `${SIDECAR_BASE}/trends?termo=${encodeURIComponent(termo)}`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as { indice?: number | null };
      if (typeof json.indice !== "number" || !Number.isFinite(json.indice) || json.indice <= 0) return;
      const s = st(termo);
      s.at = Date.now();
      s.indice = Math.round(json.indice * 10) / 10;
      persist();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* sidecar bloqueado ou fora do ar */
  }
}

function persist(): void {
  try {
    const termos: Record<string, number> = {};
    for (const [termo, s] of byTermo) if (s.indice !== null) termos[termo] = s.indice;
    writeFileSync(CACHE_FILE, `${JSON.stringify({ termos })}\n`);
  } catch {
    /* FS read-only */
  }
}

// ── compat: APIs antigas operam sobre o termo do principal ─────────────────────

export function getTrendsReal(): number | null {
  return getMencoesRealFor(getPrincipalTermo());
}
export function hasTrendsReal(): boolean {
  return hasMencoesRealFor(getPrincipalTermo());
}
export function ensureFreshTrends(): void {
  ensureFreshTrendsFor(getPrincipalTermo());
}
