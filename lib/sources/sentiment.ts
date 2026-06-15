// Cliente do sidecar de sentimento (pysentimiento, PT) — ver sidecar/sentiment.
// Pontua as manchetes reais do Google News (POR CANDIDATO) e devolve um índice
// ~100. Alimenta idx.sost.breakdown.sentimento e o índice por candidato
// (lib/index-real.ts → Índice de Reputação). Tudo com fallback: sidecar fora do
// ar / poucas manchetes → getSentimentoRealFor() = null.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  getManchetesTextoFor,
  getPrincipalTermo,
} from "@/lib/sources/google-news";

const SIDECAR_URL = process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment";
const TTL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;
const MIN_TEXTOS = 5;
const CACHE_FILE = join(process.cwd(), "data", "sentiment-cache.json");

type State = { at: number; value: number | null; inFlight: boolean };
const byTermo = new Map<string, State>();

function st(termo: string): State {
  let s = byTermo.get(termo);
  if (!s) {
    s = { at: 0, value: null, inFlight: false };
    byTermo.set(termo, s);
  }
  return s;
}

// Warm-start: recupera o último sentimento real de cada candidato após
// restart/deploy (at=0 força um refresh no 1º tick, mas o valor já aparece).
(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && typeof raw.termos === "object" && raw.termos) {
      for (const [termo, v] of Object.entries(raw.termos)) {
        if (typeof v === "number" && Number.isFinite(v)) st(termo).value = v;
      }
    }
  } catch {
    /* primeira execução */
  }
})();

function persist(): void {
  try {
    const termos: Record<string, number> = {};
    for (const [termo, s] of byTermo) if (s.value !== null) termos[termo] = s.value;
    writeFileSync(CACHE_FILE, `${JSON.stringify({ termos })}\n`);
  } catch {
    /* FS read-only */
  }
}

/** Índice de sentimento real (~100; >100 = clima favorável) do candidato. */
export function getSentimentoRealFor(termo: string): number | null {
  return byTermo.get(termo)?.value ?? null;
}

/** Pontua as manchetes do candidato no sidecar se o cache venceu. Não bloqueia. */
export function ensureFreshSentimentoFor(termo: string): void {
  const s = st(termo);
  if (s.inFlight) return;
  if (Date.now() - s.at < TTL_MS && s.value !== null) return;
  const textos = getManchetesTextoFor(termo, 30);
  if (textos.length < MIN_TEXTOS) return; // espera as manchetes do Google News
  s.inFlight = true;
  void pontuar(termo, textos).finally(() => {
    s.inFlight = false;
  });
}

/** Atualiza o sentimento de vários candidatos de uma vez. */
export function ensureFreshSentimentoAll(termos: string[]): void {
  for (const termo of termos) if (termo) ensureFreshSentimentoFor(termo);
}

// ── compat: APIs antigas operam sobre o termo do principal ─────────────────────

export function getSentimentoReal(): number | null {
  return getSentimentoRealFor(getPrincipalTermo());
}

export function ensureFreshSentimento(): void {
  ensureFreshSentimentoFor(getPrincipalTermo());
}

async function pontuar(termo: string, textos: string[]): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(SIDECAR_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ textos }),
        signal: ctrl.signal,
      });
      if (!res.ok) return; // sidecar fora do ar → mantém o último bom / null
      const json = (await res.json()) as { indice?: number | null };
      if (typeof json.indice === "number" && Number.isFinite(json.indice)) {
        const s = st(termo);
        s.at = Date.now();
        s.value = json.indice;
        persist();
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* sidecar indisponível / timeout — segue no fallback */
  }
}
