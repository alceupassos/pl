// Histórico rolante do Score do índice POR CANDIDATO — usado para a Tendência
// (comparar o Score atual com o de ~24h atrás). Persistido para sobreviver a
// restart/deploy. Espelha a ideia de lib/sources/idx-history.ts, mas guarda uma
// série temporal por símbolo (não OHLC diário).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CACHE_FILE = join(process.cwd(), "data", "index-history-cache.json");
const MIN_STEP_MS = 10 * 60 * 1000; // 1 amostra a cada ~10min por candidato
const MAX_SAMPLES = 600; // ~4 dias a cada 10min
const MIN_WRITE_MS = 60_000;

type Sample = { t: number; v: number };

let hist: Record<string, Sample[]> = {};
let lastWrite = 0;

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && typeof raw === "object") hist = raw as Record<string, Sample[]>;
  } catch {
    /* primeira execução */
  }
})();

function persist(): void {
  try {
    writeFileSync(CACHE_FILE, `${JSON.stringify(hist)}\n`);
    lastWrite = Date.now();
  } catch {
    /* FS read-only */
  }
}

/** Registra o Score atual do candidato (no máx. 1 amostra a cada MIN_STEP_MS). */
export function recordScore(now: number, simbolo: string, score: number): void {
  if (!Number.isFinite(score)) return;
  const arr = hist[simbolo] ?? (hist[simbolo] = []);
  const last = arr[arr.length - 1];
  if (last && now - last.t < MIN_STEP_MS) {
    last.v = Math.round(score * 100) / 100; // atualiza a amostra do passo corrente
  } else {
    arr.push({ t: now, v: Math.round(score * 100) / 100 });
    if (arr.length > MAX_SAMPLES) arr.splice(0, arr.length - MAX_SAMPLES);
  }
  if (Date.now() - lastWrite >= MIN_WRITE_MS) persist();
}

/** Série de Score por candidato (cópia) — alimenta os gráficos temporais 3D. */
export function readScoreSeries(): Record<string, Sample[]> {
  const out: Record<string, Sample[]> = {};
  for (const [simbolo, arr] of Object.entries(hist)) out[simbolo] = arr.slice();
  return out;
}

/** Score do candidato no instante mais próximo de (alvo), preferindo t <= alvo. */
export function scoreAt(simbolo: string, alvo: number): number | null {
  const arr = hist[simbolo];
  if (!arr || arr.length === 0) return null;
  let best: Sample | null = null;
  for (const s of arr) {
    if (s.t <= alvo) best = s;
    else break;
  }
  return (best ?? arr[0]).v;
}
