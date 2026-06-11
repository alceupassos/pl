import type { Dataset, Series } from "./types";

// Deriva uma fase estável a partir de uma string — mesmo seed, mesma fase.
function seedPhase(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return (hash % 628) / 100; // 0..2π aproximado
}

/**
 * Deriva suave e determinística para dados mock (monitor vivo).
 * Mesmo (valor, tick, seed) sempre produz o mesmo resultado — sem saltos
 * aleatórios entre renders, os valores "respiram" entre ticks.
 */
export function driftValue(value: number, tick: number, seed: string, amplitude = 0.03) {
  const phase = seedPhase(seed);
  const primary = Math.sin(phase + tick * 0.7);
  const secondary = Math.sin(phase * 2.3 + tick * 1.9) * 0.35;
  const drifted = value * (1 + amplitude * (primary + secondary));
  return Math.round(drifted * 10) / 10;
}

export type DriftOptions = {
  /** Deriva apenas os últimos N pontos — o histórico fica estável, a borda "agora" se move. */
  lastN?: number;
  amplitude?: number;
};

/** Retorna uma nova Series com os pontos numéricos derivados (nunca muta o mock). */
export function driftSeries(series: Series, tick: number, opts: DriftOptions = {}): Series {
  const { lastN, amplitude } = opts;
  return {
    labels: series.labels,
    datasets: series.datasets.map((dataset: Dataset, datasetIndex: number) => ({
      ...dataset,
      data: dataset.data.map((point, pointIndex) => {
        if (point === null) return null;
        if (lastN !== undefined && pointIndex < dataset.data.length - lastN) return point;
        return driftValue(point, tick, `${dataset.label}:${datasetIndex}:${pointIndex}`, amplitude);
      }),
    })),
  };
}

/** Para roscas/percentuais: deriva e renormaliza para a soma original (~100%). */
export function driftShare(data: number[], tick: number, seed: string, amplitude = 0.03) {
  const total = data.reduce((sum, value) => sum + value, 0);
  const drifted = data.map((value, index) =>
    Math.max(0.1, driftValue(value, tick, `${seed}:${index}`, amplitude)),
  );
  const driftedTotal = drifted.reduce((sum, value) => sum + value, 0);
  if (driftedTotal === 0) return data;
  return drifted.map((value) => Math.round((value / driftedTotal) * total * 10) / 10);
}
