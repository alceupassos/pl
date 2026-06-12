// Histórico diário REAL do índice SOST — fechamentos persistidos para velas candlestick.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Candle } from "@/lib/live-schemas";

const CACHE_FILE = join(process.cwd(), "data", "idx-history-cache.json");
const DAY = 24 * 60 * 60 * 1000;
const MIN_WRITE_MS = 60_000;

type DayOhlc = { o: number; c: number; h: number; l: number };

let history: Record<string, DayOhlc> = {};
let lastWrite = 0;

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && typeof raw === "object") history = raw as Record<string, DayOhlc>;
  } catch {
    /* primeira execução */
  }
})();

function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function persist(): void {
  try {
    writeFileSync(CACHE_FILE, `${JSON.stringify(history)}\n`);
    lastWrite = Date.now();
  } catch {
    /* FS read-only */
  }
}

/** Registra/atualiza o candle do dia corrente com o índice composto real. */
export function recordIdxClose(now: number, valor: number): void {
  const key = dayKey(now);
  const v = Math.round(valor * 100) / 100;
  const prev = history[key];
  if (!prev) {
    history[key] = { o: v, c: v, h: v, l: v };
  } else {
    history[key] = {
      o: prev.o,
      c: v,
      h: Math.max(prev.h, v),
      l: Math.min(prev.l, v),
    };
  }
  if (Date.now() - lastWrite >= MIN_WRITE_MS) persist();
}

/** Mescla histórico real com candles sintéticos (dias sem registro). */
export function mergeIdxCandles(synthetic: Candle[], _now: number): Candle[] {
  return synthetic.map((c) => {
    const key = new Date(c.t).toISOString().slice(0, 10);
    const real = history[key];
    if (!real) return c;
    return {
      t: c.t,
      o: real.o,
      c: real.c,
      h: real.h,
      l: real.l,
    };
  });
}

/** Abre do dia corrente: fechamento do dia anterior real ou sintético. */
export function idxOpenToday(now: number, fallbackOpen: number): number {
  const yesterday = dayKey(now - DAY);
  const y = history[yesterday];
  if (y) return y.c;
  const today = dayKey(now);
  const t = history[today];
  return t?.o ?? fallbackOpen;
}
