// Histórico rolante POR CANDIDATO — duas séries temporais por símbolo:
//   • score — o Score composto (alimenta os gráficos temporais 3D de /basecalculo).
//   • ire   — o IRE (Índice de Reputação Eleitoral = nota de sentimento), usado
//             para a Tendência de 7 dias (TIRE/TPRA): compara o IRE atual com o
//             de ~7 dias atrás.
// Persistido para sobreviver a restart/deploy. Espelha idx-history.ts, mas guarda
// série temporal por símbolo (não OHLC diário).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CACHE_FILE = join(process.cwd(), "data", "index-history-cache.json");
const MIN_STEP_MS = 10 * 60 * 1000; // 1 amostra a cada ~10min por candidato
const MAX_SAMPLES = 600; // Score: ~4 dias a cada 10min
const MAX_SAMPLES_IRE = 1100; // IRE: ~7,6 dias a cada 10min (cobre a janela de 7d)
const MIN_WRITE_MS = 60_000;

type Sample = { t: number; v: number };
type Serie = Record<string, Sample[]>;

let histScore: Serie = {};
let histIre: Serie = {};
let lastWrite = 0;

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && typeof raw === "object") {
      // Formato novo: { score, ire }. Formato legado: mapa plano símbolo→amostras.
      if (raw.score && typeof raw.score === "object") {
        histScore = raw.score as Serie;
        histIre = (raw.ire as Serie) ?? {};
      } else {
        histScore = raw as Serie; // legado → vira a série de score; ire começa vazio
      }
    }
  } catch {
    /* primeira execução */
  }
})();

function persist(): void {
  try {
    writeFileSync(CACHE_FILE, `${JSON.stringify({ score: histScore, ire: histIre })}\n`);
    lastWrite = Date.now();
  } catch {
    /* FS read-only */
  }
}

function record(serie: Serie, now: number, simbolo: string, v: number, max: number): void {
  if (!Number.isFinite(v)) return;
  const arr = serie[simbolo] ?? (serie[simbolo] = []);
  const last = arr[arr.length - 1];
  const val = Math.round(v * 100) / 100;
  if (last && now - last.t < MIN_STEP_MS) {
    last.v = val; // atualiza a amostra do passo corrente
  } else {
    arr.push({ t: now, v: val });
    if (arr.length > max) arr.splice(0, arr.length - max);
  }
  if (Date.now() - lastWrite >= MIN_WRITE_MS) persist();
}

/** Amostra mais próxima de (alvo), preferindo t <= alvo; null se série vazia. */
function sampleAt(serie: Serie, simbolo: string, alvo: number): Sample | null {
  const arr = serie[simbolo];
  if (!arr || arr.length === 0) return null;
  let best: Sample | null = null;
  for (const s of arr) {
    if (s.t <= alvo) best = s;
    else break;
  }
  return best ?? arr[0];
}

/** Registra o Score atual do candidato (no máx. 1 amostra a cada MIN_STEP_MS). */
export function recordScore(now: number, simbolo: string, score: number): void {
  record(histScore, now, simbolo, score, MAX_SAMPLES);
}

/** Registra o IRE atual do candidato (no máx. 1 amostra a cada MIN_STEP_MS). */
export function recordIre(now: number, simbolo: string, ire: number): void {
  record(histIre, now, simbolo, ire, MAX_SAMPLES_IRE);
}

/** Série de Score por candidato (cópia) — alimenta os gráficos temporais 3D. */
export function readScoreSeries(): Serie {
  const out: Serie = {};
  for (const [simbolo, arr] of Object.entries(histScore)) out[simbolo] = arr.slice();
  return out;
}

/** Série de IRE por candidato (cópia) — alimenta o candle de 7d do card SOST-IDX. */
export function readIreSeries(): Serie {
  const out: Serie = {};
  for (const [simbolo, arr] of Object.entries(histIre)) out[simbolo] = arr.slice();
  return out;
}

/** Score do candidato no instante mais próximo de (alvo), preferindo t <= alvo. */
export function scoreAt(simbolo: string, alvo: number): number | null {
  return sampleAt(histScore, simbolo, alvo)?.v ?? null;
}

/** IRE do candidato perto de (alvo): { v, t } com o timestamp real da amostra
 *  (o `t` permite detectar cold-start: amostra mais nova que a janela de 7d). */
export function ireAt(simbolo: string, alvo: number): { v: number; t: number } | null {
  const s = sampleAt(histIre, simbolo, alvo);
  return s ? { v: s.v, t: s.t } : null;
}
