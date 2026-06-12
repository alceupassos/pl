// Fonte REAL de buzz de busca — Google Trends via pytrends no sidecar local.
// Alimenta idx.sost.breakdown.mencoes quando disponível.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SIDECAR_BASE = (process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment").replace(
  /\/sentiment$/,
  "",
);
const TERMO = "Sóstenes Cavalcante";
const TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 25_000;
const CACHE_FILE = join(process.cwd(), "data", "trends-cache.json");

let state: { at: number; indice: number | null } = { at: 0, indice: null };
let inFlight = false;

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && typeof raw.indice === "number") state = { at: 0, indice: raw.indice };
  } catch {
    /* primeira execução */
  }
})();

/** Índice de menções/buzz (~100). null = sem dado → sintético. */
export function getTrendsReal(): number | null {
  return state.indice;
}

export function hasTrendsReal(): boolean {
  return state.indice !== null;
}

export function ensureFreshTrends(): void {
  if (inFlight) return;
  if (Date.now() - state.at < TTL_MS && state.indice !== null) return;
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
      const url = `${SIDECAR_BASE}/trends?termo=${encodeURIComponent(TERMO)}`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as { indice?: number | null };
      if (typeof json.indice !== "number" || !Number.isFinite(json.indice) || json.indice <= 0) return;
      state = { at: Date.now(), indice: Math.round(json.indice * 10) / 10 };
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
    writeFileSync(CACHE_FILE, `${JSON.stringify({ indice: state.indice })}\n`);
  } catch {
    /* FS read-only */
  }
}
