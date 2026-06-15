// Histórico rolante de SEGUIDORES POR CANDIDATO — usado para exibir os seguidores
// como índice dos últimos 7 dias (variação %), não mais como número cru. Espelha
// lib/sources/index-history.ts: uma série temporal por símbolo, persistida para
// sobreviver a restart/deploy. Começa vazio → a tendência de 7d só fica completa
// depois de ~1 semana de coleta (até lá, fallback à amostra mais antiga + flag).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CACHE_FILE = join(process.cwd(), "data", "seguidores-history.json");
const MIN_STEP_MS = 10 * 60 * 1000; // 1 amostra a cada ~10min por candidato
const MAX_SAMPLES = 1100; // ~7,6 dias a cada 10min
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

/** Registra o total de seguidores do candidato (no máx. 1 amostra a cada MIN_STEP_MS). */
export function recordSeguidores(now: number, simbolo: string, total: number): void {
  if (!Number.isFinite(total)) return;
  const arr = hist[simbolo] ?? (hist[simbolo] = []);
  const last = arr[arr.length - 1];
  const val = Math.round(total);
  if (last && now - last.t < MIN_STEP_MS) {
    last.v = val;
  } else {
    arr.push({ t: now, v: val });
    if (arr.length > MAX_SAMPLES) arr.splice(0, arr.length - MAX_SAMPLES);
  }
  if (Date.now() - lastWrite >= MIN_WRITE_MS) persist();
}

/** Seguidores do candidato perto de (alvo): { v, t } com o timestamp real da
 *  amostra (o `t` permite detectar cold-start vs. a janela de 7 dias). */
export function seguidoresAt(simbolo: string, alvo: number): { v: number; t: number } | null {
  const arr = hist[simbolo];
  if (!arr || arr.length === 0) return null;
  let best: Sample | null = null;
  for (const s of arr) {
    if (s.t <= alvo) best = s;
    else break;
  }
  const s = best ?? arr[0];
  return { v: s.v, t: s.t };
}
