// Fábricas de option ECharts do /m — tokens do terminal de bolso embutidos.
// Separadas de components/echart-options.ts (tokens e ergonomia touch próprios).
// Todas retornam objetos planos consumidos pelo wrapper components/echart.tsx.

import type { Candle, Point } from "@/lib/live-schemas";

const UP = "#16C784";
const DOWN = "#EA3943";
const TEXT = "#8a93a8";
const GRID = "rgba(255,255,255,0.06)";
const MONO = "var(--m-font-mono)";

const tooltip = {
  backgroundColor: "rgba(10,13,19,0.97)",
  borderColor: "#1e2638",
  textStyle: { color: "#e8ecf4", fontSize: 11 },
  confine: true,
};

const axis = {
  axisLine: { lineStyle: { color: GRID } },
  axisTick: { show: false },
  axisLabel: { color: TEXT, fontSize: 9, hideOverlap: true },
  splitLine: { lineStyle: { color: GRID } },
};

function fmtDia(t: number): string {
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtHora(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Candlestick diário (30d + candle vivo). `refLine` desenha a linha de
 * referência (ex.: índice-base da votação 2022 do concorrente).
 */
export function candlestickOption(opts: {
  candles: Candle[];
  compact?: boolean;
  refLine?: { value: number; label: string } | null;
}): Record<string, unknown> {
  const { candles, compact = false, refLine = null } = opts;
  return {
    backgroundColor: "transparent",
    animation: !compact,
    animationDurationUpdate: 280,
    tooltip: compact
      ? undefined
      : {
          ...tooltip,
          trigger: "axis",
          // crosshair arrastável no touch: axisPointer cross segue o dedo
          axisPointer: { type: "cross", label: { backgroundColor: "#1e2638", fontSize: 9 } },
          formatter: (params: { data: number[]; axisValue: string }[]) => {
            const p = Array.isArray(params) ? params[0] : params;
            if (!p?.data) return "";
            const [, o, c, l, h] = p.data as number[];
            return `${p.axisValue}<br/>A ${o} · F ${c}<br/>Mín ${l} · Máx ${h}`;
          },
        },
    grid: {
      left: compact ? 2 : 6,
      right: compact ? 2 : 38,
      top: compact ? 4 : 8,
      bottom: compact ? 2 : 18,
      containLabel: !compact,
    },
    xAxis: {
      type: "category",
      data: candles.map((c) => fmtDia(c.t)),
      ...axis,
      axisLabel: { ...axis.axisLabel, show: !compact, interval: 6 },
      splitLine: { show: false },
      boundaryGap: true,
    },
    yAxis: {
      type: "value",
      scale: true,
      position: "right",
      ...axis,
      axisLabel: { ...axis.axisLabel, show: !compact, fontFamily: MONO },
      splitLine: { show: !compact, lineStyle: { color: GRID } },
    },
    series: [
      {
        type: "candlestick",
        // ordem ECharts: [abertura, fechamento, mínima, máxima]
        data: candles.map((c) => [c.o, c.c, c.l, c.h]),
        itemStyle: {
          color: UP,
          color0: DOWN,
          borderColor: UP,
          borderColor0: DOWN,
          borderWidth: 1,
        },
        barWidth: compact ? "62%" : "58%",
        markLine: refLine
          ? {
              silent: true,
              symbol: "none",
              lineStyle: { color: "#f5a623", type: "dashed", width: 1 },
              label: {
                show: !compact,
                color: "#f5a623",
                fontSize: 8.5,
                formatter: refLine.label,
                position: "insideEndTop",
              },
              data: [{ yAxis: refLine.value }],
            }
          : undefined,
      },
    ],
  };
}

/** Comparação multi-série (fechamentos, normalizados em 100) — legenda interativa + pinça. */
export function compareLinesOption(opts: {
  labels: string[];
  series: { nome: string; cor: string; data: number[] }[];
  normalize?: boolean;
}): Record<string, unknown> {
  const { labels, series, normalize = true } = opts;
  const norm = (data: number[]) => {
    const base = data.find((v) => v !== 0) ?? 1;
    return data.map((v) => Math.round((v / base) * 10000) / 100);
  };
  return {
    backgroundColor: "transparent",
    animationDurationUpdate: 300,
    tooltip: { ...tooltip, trigger: "axis" },
    // tocar no nome liga/desliga a série — nativo do ECharts
    legend: {
      type: "scroll",
      bottom: 0,
      textStyle: { color: TEXT, fontSize: 10 },
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 3,
      itemGap: 10,
      inactiveColor: "#3a4358",
    },
    grid: { left: 8, right: 34, top: 12, bottom: 34, containLabel: true },
    xAxis: { type: "category", data: labels, ...axis, boundaryGap: false },
    yAxis: {
      type: "value",
      scale: true,
      position: "right",
      ...axis,
      axisLabel: { ...axis.axisLabel, fontFamily: MONO },
    },
    // pinça para zoom + pan por arrasto — nativo do dataZoom inside no touch
    dataZoom: [{ type: "inside", filterMode: "weakFilter" }],
    series: series.map((s) => ({
      name: s.nome,
      type: "line",
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: s.cor },
      itemStyle: { color: s.cor },
      data: normalize ? norm(s.data) : s.data,
    })),
  };
}

/** Sparkline mínima — custo quase zero, dezenas por tela. */
export function sparklineOption(data: number[], cor: string, opts: { area?: boolean } = {}): Record<string, unknown> {
  return {
    backgroundColor: "transparent",
    animation: false,
    silent: true,
    grid: { left: 0, right: 0, top: 2, bottom: 2 },
    xAxis: { type: "category", show: false, data: data.map((_, i) => i), boundaryGap: false },
    yAxis: { type: "value", show: false, scale: true },
    series: [
      {
        type: "line",
        data,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.4, color: cor },
        areaStyle: opts.area ? { color: cor, opacity: 0.12 } : undefined,
      },
    ],
  };
}

/** Eletrocardiograma de sentimento — linha dupla streaming (janela deslizante). */
export function ecgStreamOption(opts: { pos: Point[]; neg: Point[]; resolucao: "h1" | "h24" | "d7" }): Record<string, unknown> {
  const { pos, neg, resolucao } = opts;
  const fmt = resolucao === "d7" ? fmtDia : fmtHora;
  return {
    backgroundColor: "transparent",
    animation: false, // janela desliza — re-render parcial, sem tween
    tooltip: { ...tooltip, trigger: "axis" },
    grid: { left: 6, right: 32, top: 8, bottom: 18, containLabel: true },
    xAxis: {
      type: "category",
      data: pos.map((p) => fmt(p.t)),
      ...axis,
      boundaryGap: false,
      axisLabel: { ...axis.axisLabel, interval: Math.max(1, Math.floor(pos.length / 4)) },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      scale: true,
      position: "right",
      ...axis,
      axisLabel: { ...axis.axisLabel, fontFamily: MONO },
    },
    series: [
      {
        name: "Positivas",
        type: "line",
        data: pos.map((p) => p.v),
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 1.6, color: UP },
        itemStyle: { color: UP },
        areaStyle: { color: UP, opacity: 0.07 },
      },
      {
        name: "Negativas",
        type: "line",
        data: neg.map((p) => p.v),
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 1.6, color: DOWN },
        itemStyle: { color: DOWN },
        areaStyle: { color: DOWN, opacity: 0.07 },
      },
    ],
  };
}

/** Racing bar horizontal (realtimeSort) — quem fala pela oposição / racing RJ. */
export function racingBarOption(opts: {
  items: { nome: string; valor: number; cor?: string }[];
  max?: number;
}): Record<string, unknown> {
  const { items, max } = opts;
  return {
    backgroundColor: "transparent",
    // o touch global zera animação em echart-options; aqui o racing PRECISA dela
    animationDuration: 0,
    animationDurationUpdate: 600,
    animationEasingUpdate: "linear",
    tooltip: { ...tooltip, trigger: "item" },
    grid: { left: 8, right: 44, top: 4, bottom: 4, containLabel: true },
    xAxis: { type: "value", max, ...axis, splitLine: { show: false }, axisLabel: { ...axis.axisLabel, show: false } },
    yAxis: {
      type: "category",
      inverse: true,
      data: items.map((i) => i.nome),
      ...axis,
      axisLabel: { ...axis.axisLabel, width: 104, overflow: "truncate", fontSize: 10 },
      animationDuration: 300,
      animationDurationUpdate: 300,
      splitLine: { show: false },
    },
    series: [
      {
        type: "bar",
        realtimeSort: true,
        data: items.map((i) => ({ value: i.valor, itemStyle: { color: i.cor ?? UP, borderRadius: 3 } })),
        barWidth: 12,
        label: {
          show: true,
          position: "right",
          color: TEXT,
          fontSize: 9.5,
          fontFamily: MONO,
          valueAnimation: true,
        },
      },
    ],
  };
}

/** Barras divergentes aprovação × desaprovação por segmento. */
export function divergingBarsOption(
  segmentos: { seg: string; aprova: number; desaprova: number }[],
): Record<string, unknown> {
  return {
    backgroundColor: "transparent",
    animationDurationUpdate: 400,
    tooltip: { ...tooltip, trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 8, right: 8, top: 4, bottom: 4, containLabel: true },
    xAxis: {
      type: "value",
      min: -100,
      max: 100,
      ...axis,
      axisLabel: { ...axis.axisLabel, formatter: (v: number) => `${Math.abs(v)}%` },
      splitLine: { show: false },
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: segmentos.map((s) => s.seg),
      ...axis,
      axisLabel: { ...axis.axisLabel, width: 84, overflow: "truncate", fontSize: 10 },
      splitLine: { show: false },
    },
    series: [
      {
        name: "Desaprova",
        type: "bar",
        stack: "x",
        data: segmentos.map((s) => -s.desaprova),
        itemStyle: { color: DOWN, borderRadius: [3, 0, 0, 3] },
        barWidth: 12,
        label: { show: true, position: "left", color: DOWN, fontSize: 9, fontFamily: MONO, formatter: (p: { value: number }) => `${Math.abs(p.value)}` },
      },
      {
        name: "Aprova",
        type: "bar",
        stack: "x",
        data: segmentos.map((s) => s.aprova),
        itemStyle: { color: UP, borderRadius: [0, 3, 3, 0] },
        barWidth: 12,
        label: { show: true, position: "right", color: UP, fontSize: 9, fontFamily: MONO },
      },
    ],
  };
}

/** Poll of polls com bandas de confiança (lo/hi empilhados como faixa). */
export function pollBandsOption(opts: {
  labels: string[];
  series: { nome: string; cor: string; media: number[]; lo: number[]; hi: number[] }[];
}): Record<string, unknown> {
  const { labels, series } = opts;
  const bands = series.flatMap((s, idx) => [
    {
      name: `${s.nome} (banda)`,
      type: "line",
      data: s.lo,
      stack: `band${idx}`,
      showSymbol: false,
      lineStyle: { opacity: 0 },
      tooltip: { show: false },
      silent: true,
    },
    {
      name: `${s.nome} (banda+)`,
      type: "line",
      data: s.hi.map((v, i) => Math.max(0, v - s.lo[i])),
      stack: `band${idx}`,
      showSymbol: false,
      lineStyle: { opacity: 0 },
      areaStyle: { color: s.cor, opacity: 0.12 },
      tooltip: { show: false },
      silent: true,
    },
  ]);
  return {
    backgroundColor: "transparent",
    animationDurationUpdate: 400,
    tooltip: { ...tooltip, trigger: "axis" },
    legend: {
      bottom: 0,
      textStyle: { color: TEXT, fontSize: 10 },
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 3,
      data: series.map((s) => s.nome),
    },
    grid: { left: 8, right: 32, top: 10, bottom: 32, containLabel: true },
    xAxis: { type: "category", data: labels, ...axis, boundaryGap: false },
    yAxis: {
      type: "value",
      scale: true,
      position: "right",
      ...axis,
      axisLabel: { ...axis.axisLabel, formatter: "{value}%", fontFamily: MONO },
    },
    series: [
      ...bands,
      ...series.map((s) => ({
        name: s.nome,
        type: "line",
        data: s.media,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.2, color: s.cor },
        itemStyle: { color: s.cor },
      })),
    ],
  };
}

/** Gauge compacto (fidelidade da bancada). */
export function mGaugeOption(opts: { pct: number; cor?: string; label: string }): Record<string, unknown> {
  const { pct, cor = UP, label } = opts;
  return {
    backgroundColor: "transparent",
    animationDurationUpdate: 600,
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        progress: { show: true, width: 10, itemStyle: { color: cor } },
        axisLine: { lineStyle: { width: 10, color: [[1, "rgba(255,255,255,0.07)"]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        title: { offsetCenter: [0, "34%"], color: TEXT, fontSize: 10 },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, "-4%"],
          color: "#e8ecf4",
          fontSize: 22,
          fontWeight: 700,
          fontFamily: MONO,
          formatter: (v: number) => `${v.toFixed(1)}%`,
        },
        data: [{ value: pct, name: label }],
      },
    ],
  };
}
