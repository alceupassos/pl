// Cliente do sidecar de sentimento (pysentimiento, PT) — ver sidecar/sentiment.
// Pontua as manchetes reais do Google News e devolve um índice ~100 para
// idx.sost.breakdown.sentimento. Tudo com fallback: sidecar fora do ar / poucas
// manchetes → getSentimentoReal() = null → live-mock cai no sintético.

import { getManchetesTexto } from "@/lib/sources/google-news";

const SIDECAR_URL = process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment";
const TTL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;
const MIN_TEXTOS = 5;

let cache: { at: number; value: number | null } = { at: 0, value: null };
let inFlight = false;

/** Índice de sentimento real (~100; >100 = clima favorável). null = sem sinal. */
export function getSentimentoReal(): number | null {
  return cache.value;
}

/** Dispara a pontuação das manchetes no sidecar se o cache venceu. Não bloqueia. */
export function ensureFreshSentimento(): void {
  if (inFlight) return;
  if (Date.now() - cache.at < TTL_MS && cache.value !== null) return;
  const textos = getManchetesTexto(30);
  if (textos.length < MIN_TEXTOS) return; // espera as manchetes do Google News
  inFlight = true;
  void pontuar(textos).finally(() => {
    inFlight = false;
  });
}

async function pontuar(textos: string[]): Promise<void> {
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
        cache = { at: Date.now(), value: json.indice };
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* sidecar indisponível / timeout — segue no fallback */
  }
}
