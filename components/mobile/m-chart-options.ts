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

/** Linha de fechamentos (mesmos candles do candlestick) — alternativa ao gráfico de velas. */
export function closeLineOption(opts: {
  candles: Candle[];
  compact?: boolean;
  cor?: string;
  refLine?: { value: number; label: string } | null;
}): Record<string, unknown> {
  const { candles, compact = false, cor = UP, refLine = null } = opts;
  return {
    backgroundColor: "transparent",
    animation: !compact,
    animationDurationUpdate: 280,
    tooltip: compact
      ? undefined
      : {
          ...tooltip,
          trigger: "axis",
          axisPointer: { type: "line", label: { backgroundColor: "#1e2638", fontSize: 9 } },
          formatter: (params: { data: number; axisValue: string }[]) => {
            const p = Array.isArray(params) ? params[0] : params;
            if (!p) return "";
            return `${p.axisValue}<br/>Fech. ${p.data}`;
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
      boundaryGap: false,
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
        type: "line",
        data: candles.map((c) => c.c),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: compact ? 1.5 : 2, color: cor },
        areaStyle: compact
          ? undefined
          : {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: `${cor}33` },
                  { offset: 1, color: `${cor}05` },
                ],
              },
            },
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

// ───────────────────────────────────────────────────────────────────────────
// Fábricas adicionais (avatares, agrupadas, funil, heatmap, bullet, finanças)
// ───────────────────────────────────────────────────────────────────────────

const WARN = "#F5A623";

/** Converte hex (#RRGGBB) em rgba com alpha — usado nos gradientes de área. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Racing bar horizontal com CABEÇA (avatar) no rótulo do eixo Y.
 * Sem realtimeSort: a própria fábrica ordena por valor desc — os rich keys
 * av0..avN seguem a ordem ordenada.
 */
export function avatarRacingOption(opts: {
  items: { nome: string; valor: number; cor: string; img: string }[];
  max?: number;
  suffix?: string;
}): Record<string, unknown> {
  const { max, suffix = "" } = opts;
  const items = [...opts.items].sort((a, b) => b.valor - a.valor);
  const rich: Record<string, Record<string, unknown>> = {
    nm: { color: TEXT, fontSize: 10, padding: [0, 0, 0, 4] },
  };
  items.forEach((it, i) => {
    rich[`av${i}`] = { backgroundColor: { image: it.img }, width: 20, height: 20, borderRadius: 10 };
  });
  return {
    backgroundColor: "transparent",
    animationDuration: 0,
    animationDurationUpdate: 600,
    tooltip: { ...tooltip, trigger: "item" },
    grid: { left: 8, right: 46, top: 4, bottom: 4, containLabel: true },
    xAxis: { type: "value", max, ...axis, splitLine: { show: false }, axisLabel: { ...axis.axisLabel, show: false } },
    yAxis: {
      type: "category",
      inverse: true,
      data: items.map((i) => i.nome),
      ...axis,
      splitLine: { show: false },
      axisLabel: {
        ...axis.axisLabel,
        formatter: (value: string, idx: number) => `{av${idx}|} {nm|${value}}`,
        rich,
      },
    },
    series: [
      {
        type: "bar",
        data: items.map((i) => ({ value: i.valor, itemStyle: { color: i.cor, borderRadius: 3 } })),
        barWidth: 14,
        label: {
          show: true,
          position: "right",
          color: TEXT,
          fontSize: 9.5,
          fontFamily: MONO,
          formatter: (p: { value: number }) => `${p.value}${suffix}`,
        },
      },
    ],
  };
}

/** Scatter com avatares (image://) — mapa de posicionamento; quadrante opcional. */
export function scatterAvatarOption(opts: {
  pontos: { x: number; y: number; nome: string; cor: string; img: string; destaque?: boolean }[];
  xLabel: string;
  yLabel: string;
  quadrante?: { x: number; y: number };
}): Record<string, unknown> {
  const { pontos, xLabel, yLabel, quadrante } = opts;
  return {
    backgroundColor: "transparent",
    animationDurationUpdate: 400,
    tooltip: {
      ...tooltip,
      trigger: "item",
      formatter: (p: { data: { nome: string; value: [number, number] } }) =>
        `${p.data.nome}<br/>${xLabel}: ${p.data.value[0]}<br/>${yLabel}: ${p.data.value[1]}`,
    },
    grid: { left: 8, right: 14, top: 12, bottom: 20, containLabel: true },
    xAxis: {
      type: "value",
      name: xLabel,
      nameTextStyle: { color: TEXT, fontSize: 9 },
      nameGap: 4,
      ...axis,
    },
    yAxis: {
      type: "value",
      name: yLabel,
      nameTextStyle: { color: TEXT, fontSize: 9 },
      nameGap: 6,
      ...axis,
    },
    series: [
      {
        type: "scatter",
        data: pontos.map((p) => ({
          value: [p.x, p.y],
          nome: p.nome,
          symbol: `image://${p.img}`,
          symbolSize: p.destaque ? 34 : 26,
          itemStyle: { color: p.cor },
          label: {
            show: true,
            position: "bottom",
            fontSize: 8,
            color: TEXT,
            formatter: p.nome.split(" ")[0],
          },
        })),
        markLine: quadrante
          ? {
              silent: true,
              symbol: "none",
              lineStyle: { color: TEXT, type: "dashed", width: 1, opacity: 0.5 },
              label: { show: false },
              data: [{ xAxis: quadrante.x }, { yAxis: quadrante.y }],
            }
          : undefined,
      },
    ],
  };
}

/** Barras agrupadas (vertical ou horizontal) com legenda scroll no rodapé. */
export function groupedBarsOption(opts: {
  labels: string[];
  series: { nome: string; cor: string; data: number[] }[];
  horizontal?: boolean;
  suffix?: string;
}): Record<string, unknown> {
  const { labels, series, horizontal = false, suffix = "" } = opts;
  const catAxis = {
    type: "category",
    data: labels,
    ...axis,
    splitLine: { show: false },
  };
  const valAxis = {
    type: "value",
    ...axis,
    axisLabel: { ...axis.axisLabel, fontFamily: MONO, formatter: (v: number) => `${v}${suffix}` },
  };
  return {
    backgroundColor: "transparent",
    animationDurationUpdate: 400,
    tooltip: { ...tooltip, trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      type: "scroll",
      bottom: 0,
      textStyle: { color: TEXT, fontSize: 10 },
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 3,
      itemGap: 10,
    },
    grid: { left: 8, right: 12, top: 8, bottom: 32, containLabel: true },
    xAxis: horizontal ? valAxis : catAxis,
    yAxis: horizontal ? catAxis : valAxis,
    series: series.map((s) => ({
      name: s.nome,
      type: "bar",
      data: s.data,
      barMaxWidth: 16,
      itemStyle: { color: s.cor, borderRadius: 3 },
    })),
  };
}

/** Linhas suaves com área gradiente; série secundária opcional no eixo direito. */
export function areaStackOption(opts: {
  labels: string[];
  series: { nome: string; cor: string; data: number[]; area?: boolean }[];
  series2?: { nome: string; cor: string; data: number[] };
}): Record<string, unknown> {
  const { labels, series, series2 } = opts;
  const yPrimary = {
    type: "value",
    scale: true,
    ...axis,
    axisLabel: { ...axis.axisLabel, fontFamily: MONO },
  };
  const ySecondary = {
    type: "value",
    scale: true,
    position: "right",
    ...axis,
    splitLine: { show: false },
    axisLabel: { ...axis.axisLabel, fontFamily: MONO },
  };
  return {
    backgroundColor: "transparent",
    animationDurationUpdate: 400,
    tooltip: { ...tooltip, trigger: "axis" },
    legend: {
      type: "scroll",
      bottom: 0,
      textStyle: { color: TEXT, fontSize: 10 },
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 3,
      itemGap: 10,
    },
    grid: { left: 8, right: series2 ? 34 : 12, top: 10, bottom: 32, containLabel: true },
    xAxis: { type: "category", data: labels, ...axis, boundaryGap: false },
    yAxis: series2 ? [yPrimary, ySecondary] : yPrimary,
    series: [
      ...series.map((s) => ({
        name: s.nome,
        type: "line",
        smooth: true,
        showSymbol: false,
        data: s.data,
        lineStyle: { width: 2, color: s.cor },
        itemStyle: { color: s.cor },
        areaStyle: s.area
          ? {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: hexToRgba(s.cor, 0.25) },
                  { offset: 1, color: hexToRgba(s.cor, 0.02) },
                ],
              },
            }
          : undefined,
      })),
      ...(series2
        ? [
            {
              name: series2.nome,
              type: "line",
              smooth: true,
              showSymbol: false,
              yAxisIndex: 1,
              data: series2.data,
              lineStyle: { width: 1.8, color: series2.cor, type: "dashed" },
              itemStyle: { color: series2.cor },
            },
          ]
        : []),
    ],
  };
}

/** Donut com valor central via title (sem graphic) e legenda no rodapé. */
export function donutOption(opts: {
  items: { nome: string; valor: number; cor: string }[];
  centro?: { valor: string; label: string };
}): Record<string, unknown> {
  const { items, centro } = opts;
  return {
    backgroundColor: "transparent",
    animationDurationUpdate: 400,
    tooltip: { ...tooltip, trigger: "item" },
    title: centro
      ? {
          text: centro.valor,
          subtext: centro.label,
          left: "center",
          top: "38%",
          textStyle: { color: "#e8ecf4", fontSize: 18, fontWeight: 800 },
          subtextStyle: { color: TEXT, fontSize: 9 },
        }
      : undefined,
    legend: {
      type: "scroll",
      bottom: 0,
      textStyle: { color: TEXT, fontSize: 10 },
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 10,
    },
    series: [
      {
        type: "pie",
        radius: ["58%", "78%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: items.map((i) => ({
          name: i.nome,
          value: i.valor,
          itemStyle: { color: i.cor },
        })),
      },
    ],
  };
}

/** Funil de conversão — rótulo interno escuro sobre as faixas coloridas. */
export function funnelOption(opts: {
  etapas: { nome: string; valor: number; cor: string }[];
}): Record<string, unknown> {
  const { etapas } = opts;
  return {
    backgroundColor: "transparent",
    animationDurationUpdate: 400,
    tooltip: { ...tooltip, trigger: "item" },
    series: [
      {
        type: "funnel",
        sort: "descending",
        gap: 3,
        minSize: "22%",
        left: 8,
        right: 8,
        top: 4,
        bottom: 4,
        label: {
          show: true,
          position: "inside",
          color: "#0B0E14",
          fontWeight: 700,
          fontSize: 9,
          formatter: "{b}\n{c}",
        },
        labelLine: { show: false },
        itemStyle: { borderWidth: 0 },
        data: etapas.map((e) => ({ name: e.nome, value: e.valor, itemStyle: { color: e.cor } })),
      },
    ],
  };
}

/** Heatmap dias × horas (0–100) — visualMap escondido, células com borda escura. */
export function heatmapHorasOption(opts: {
  dias: string[];
  horas: string[];
  values: [number, number, number][];
}): Record<string, unknown> {
  const { dias, horas, values } = opts;
  return {
    backgroundColor: "transparent",
    animation: false,
    tooltip: {
      ...tooltip,
      trigger: "item",
      formatter: (p: { value: [number, number, number] }) =>
        `${dias[p.value[1]]} ${horas[p.value[0]]}h: ${p.value[2]}`,
    },
    grid: { left: 8, right: 8, top: 8, bottom: 18, containLabel: true },
    xAxis: { type: "category", data: horas, ...axis, splitLine: { show: false } },
    yAxis: { type: "category", data: dias, ...axis, splitLine: { show: false } },
    visualMap: {
      show: false,
      min: 0,
      max: 100,
      inRange: { color: ["#121724", "#14532d", UP, WARN] },
    },
    series: [
      {
        type: "heatmap",
        data: values,
        label: { show: false },
        itemStyle: { borderColor: "#0B0E14", borderWidth: 1 },
      },
    ],
  };
}

/** Barras bullet (meta cinza de fundo + atual colorida sobreposta) com % da meta. */
export function bulletBarsOption(opts: {
  items: { nome: string; atual: number; meta: number; cor?: string }[];
  suffix?: string;
}): Record<string, unknown> {
  const { items, suffix = "" } = opts;
  return {
    backgroundColor: "transparent",
    animationDurationUpdate: 400,
    tooltip: {
      ...tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v: number) => `${v}${suffix}`,
    },
    grid: { left: 8, right: 46, top: 4, bottom: 4, containLabel: true },
    xAxis: { type: "value", ...axis, splitLine: { show: false }, axisLabel: { ...axis.axisLabel, show: false } },
    yAxis: {
      type: "category",
      inverse: true,
      data: items.map((i) => i.nome),
      ...axis,
      axisLabel: { ...axis.axisLabel, width: 92, overflow: "truncate", fontSize: 10 },
      splitLine: { show: false },
    },
    series: [
      {
        name: "Meta",
        type: "bar",
        silent: true,
        data: items.map((i) => i.meta),
        barWidth: 14,
        itemStyle: { color: "rgba(255,255,255,0.08)", borderRadius: 3 },
      },
      {
        name: "Atual",
        type: "bar",
        barGap: "-100%",
        data: items.map((i) => ({ value: i.atual, itemStyle: { color: i.cor ?? UP, borderRadius: 3 } })),
        barWidth: 14,
        label: {
          show: true,
          position: "right",
          color: TEXT,
          fontSize: 9.5,
          fontFamily: MONO,
          formatter: (p: { dataIndex: number }) => {
            const it = items[p.dataIndex];
            return `${Math.round((it.atual / it.meta) * 100)}%`;
          },
        },
      },
    ],
  };
}

/** Planejado (dashed cinza) × realizado (sólido verde + área) × projeção (dotted âmbar). */
export function financeLinesOption(opts: {
  labels: string[];
  planejado: number[];
  realizado: number[];
  projecao: number[];
}): Record<string, unknown> {
  const { labels, planejado, realizado, projecao } = opts;
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
      itemGap: 10,
    },
    grid: { left: 8, right: 12, top: 10, bottom: 32, containLabel: true },
    xAxis: { type: "category", data: labels, ...axis, boundaryGap: false },
    yAxis: {
      type: "value",
      scale: true,
      ...axis,
      axisLabel: { ...axis.axisLabel, fontFamily: MONO },
    },
    series: [
      {
        name: "Planejado",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: planejado,
        lineStyle: { width: 1.6, color: TEXT, type: "dashed" },
        itemStyle: { color: TEXT },
      },
      {
        name: "Realizado",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: realizado,
        lineStyle: { width: 2.4, color: UP },
        itemStyle: { color: UP },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: hexToRgba(UP, 0.18) },
              { offset: 1, color: hexToRgba(UP, 0.02) },
            ],
          },
        },
      },
      {
        name: "Projeção",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: projecao,
        lineStyle: { width: 2, color: WARN, type: "dotted" },
        itemStyle: { color: WARN },
      },
    ],
  };
}

/** Timeline de pesquisas multi-série — avatar (markPoint image://) no último ponto. */
export function pollTimelineAvatarsOption(opts: {
  labels: string[];
  series: { nome: string; cor: string; data: number[]; img: string }[];
}): Record<string, unknown> {
  const { labels, series } = opts;
  return {
    backgroundColor: "transparent",
    animationDurationUpdate: 400,
    tooltip: { ...tooltip, trigger: "axis" },
    legend: {
      type: "scroll",
      bottom: 0,
      textStyle: { color: TEXT, fontSize: 10 },
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 3,
      itemGap: 10,
    },
    grid: { left: 8, right: 26, top: 14, bottom: 32, containLabel: true },
    xAxis: { type: "category", data: labels, ...axis, boundaryGap: false },
    yAxis: {
      type: "value",
      scale: true,
      ...axis,
      axisLabel: { ...axis.axisLabel, formatter: "{value}%", fontFamily: MONO },
    },
    series: series.map((s) => ({
      name: s.nome,
      type: "line",
      smooth: true,
      showSymbol: false,
      data: s.data,
      lineStyle: { width: 2, color: s.cor },
      itemStyle: { color: s.cor },
      markPoint: {
        symbol: `image://${s.img}`,
        symbolSize: 22,
        data: [{ coord: [labels.length - 1, s.data[s.data.length - 1]] }],
        label: { show: false },
      },
    })),
  };
}
