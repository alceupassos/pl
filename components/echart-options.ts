// Fábricas de `option` do ECharts, com estética escura alinhada aos tokens.
// Consomem a camada de mock (lib/mock/*). Retornam objetos planos.

import type { MatrixPoint, Series } from "@/lib/mock/types";
import { COLORS } from "@/lib/mock/campaign-metrics";

const TXT = "#8a8aaa";
const GRID = "rgba(255,255,255,0.07)";
const BG = "transparent";

const axisCommon = {
  axisLine: { lineStyle: { color: GRID } },
  axisLabel: { color: TXT, fontSize: 10, hideOverlap: true },
  splitLine: { lineStyle: { color: GRID } },
};

// Transições suaves quando os dados mudam (monitor vivo).
// Respeita prefers-reduced-motion — animações de canvas não são cobertas por CSS.
function liveUpdate() {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    animationDurationUpdate: reduced ? 0 : 700,
    animationEasingUpdate: "cubicOut",
  };
}

const tooltipDark = {
  backgroundColor: "rgba(16,16,24,0.96)",
  borderColor: "rgba(255,255,255,0.08)",
  textStyle: { color: "#e6e6f0", fontSize: 12 },
  // Mantém o tooltip dentro do canvas (evita corte com overflow-x hidden no mobile).
  confine: true,
};

const legendDark = {
  textStyle: { color: TXT, fontSize: 10 },
  icon: "circle",
  itemWidth: 12,
  itemGap: 10,
  bottom: 0,
};

/** Donut a partir de rótulos/valores/paleta. */
export function donutOption(
  labels: string[],
  data: number[],
  palette: string[],
  unidade = "",
) {
  return {
    backgroundColor: BG,
    ...liveUpdate(),
    tooltip: {
      ...tooltipDark,
      trigger: "item",
      formatter: `{b}: {c}${unidade} ({d}%)`,
    },
    legend: { ...legendDark, data: labels },
    series: [
      {
        type: "pie",
        radius: ["52%", "74%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: "#0f0f13", borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            color: "#fff",
            fontSize: 14,
            formatter: "{b}\n{d}%",
          },
        },
        data: labels.map((l, i) => ({
          name: l,
          value: data[i],
          itemStyle: { color: palette[i] },
        })),
      },
    ],
  };
}

/** Organograma (tree) horizontal para a hierarquia de organizadores. */
export function orgTreeOption(root: unknown) {
  return {
    backgroundColor: BG,
    tooltip: { ...tooltipDark, trigger: "item", triggerOn: "mousemove" },
    series: [
      {
        type: "tree",
        data: [root],
        left: "2%",
        right: "16%",
        top: "2%",
        bottom: "2%",
        symbolSize: 9,
        orient: "LR",
        expandAndCollapse: true,
        initialTreeDepth: 2,
        label: {
          position: "left",
          verticalAlign: "middle",
          align: "right",
          color: "#e6e6f0",
          fontSize: 11,
        },
        leaves: {
          label: {
            position: "right",
            verticalAlign: "middle",
            align: "left",
            color: TXT,
          },
        },
        lineStyle: {
          color: "rgba(255,255,255,0.14)",
          width: 1.2,
          curveness: 0.5,
        },
        emphasis: { focus: "descendant" },
        animationDuration: 600,
        animationDurationUpdate: 600,
      },
    ],
  };
}

/** Linha (multi-série) a partir de um `Series`, com gradiente de área opcional. */
export function lineOption(series: Series, opts: { area?: boolean } = {}) {
  return {
    backgroundColor: BG,
    ...liveUpdate(),
    tooltip: { ...tooltipDark, trigger: "axis" },
    legend:
      series.datasets.length > 1
        ? { ...legendDark, data: series.datasets.map((d) => d.label) }
        : { show: false },
    grid: {
      left: 44,
      right: 18,
      top: 16,
      bottom: series.datasets.length > 1 ? 36 : 24,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: series.labels,
      ...axisCommon,
    },
    yAxis: { type: "value", ...axisCommon },
    series: series.datasets.map((ds) => ({
      name: ds.label,
      type: "line",
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2.5, color: ds.color },
      itemStyle: { color: ds.color },
      areaStyle: opts.area
        ? {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: hexA(ds.color, 0.32) },
                { offset: 1, color: hexA(ds.color, 0.01) },
              ],
            },
          }
        : undefined,
      data: ds.data,
    })),
  };
}

/** Barras (agrupadas) a partir de um `Series`. */
export function barOption(series: Series, opts: { horizontal?: boolean } = {}) {
  const cat = {
    type: "category",
    data: series.labels,
    ...axisCommon,
    // Nomes longos (regiões) viram reticências em vez de serem cortados pelo canvas.
    ...(opts.horizontal
      ? {
          axisLabel: {
            ...axisCommon.axisLabel,
            width: 92,
            overflow: "truncate" as const,
          },
        }
      : {}),
  };
  const val = { type: "value", ...axisCommon };
  return {
    backgroundColor: BG,
    ...liveUpdate(),
    tooltip: {
      ...tooltipDark,
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    legend:
      series.datasets.length > 1
        ? { ...legendDark, data: series.datasets.map((d) => d.label) }
        : { show: false },
    grid: opts.horizontal
      ? { left: 8, right: 18, top: 8, bottom: 8, containLabel: true }
      : {
          left: 44,
          right: 18,
          top: 16,
          bottom: series.datasets.length > 1 ? 36 : 24,
        },
    xAxis: opts.horizontal ? val : cat,
    yAxis: opts.horizontal ? cat : val,
    series: series.datasets.map((ds) => ({
      name: ds.label,
      type: "bar",
      data: ds.palette
        ? ds.data.map((v, i) => ({
            value: v,
            itemStyle: { color: ds.palette![i] },
          }))
        : ds.data,
      itemStyle: { color: ds.color, borderRadius: 4 },
      barMaxWidth: 38,
    })),
  };
}

function hexA(color: string, alpha: number): string {
  if (color.startsWith("rgb")) return color;
  const h = color.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16),
    g = parseInt(h.slice(2, 4), 16),
    b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Medidor (gauge) para metas/percentuais. */
export function gaugeOption(
  value: number,
  label: string,
  color = COLORS.verde,
  max = 100,
) {
  return {
    backgroundColor: BG,
    ...liveUpdate(),
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max,
        progress: { show: true, width: 14, itemStyle: { color } },
        axisLine: {
          lineStyle: { width: 14, color: [[1, "rgba(255,255,255,0.08)"]] },
        },
        axisTick: { show: false },
        splitLine: { length: 10, lineStyle: { color: GRID } },
        axisLabel: { color: TXT, fontSize: 9, distance: 14 },
        pointer: { show: true, width: 5, itemStyle: { color } },
        anchor: { show: true, size: 10, itemStyle: { color } },
        title: { offsetCenter: [0, "62%"], color: TXT, fontSize: 11 },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, "30%"],
          color: "#f0f0f0",
          fontSize: 26,
          fontWeight: 700,
          formatter: (v: number) =>
            max === 100
              ? `${Math.round(v)}%`
              : Math.round(v).toLocaleString("pt-BR"),
        },
        data: [{ value, name: label }],
      },
    ],
  };
}

/** Funil meta → inscritos → cadastrados → engajados. */
export function funnelOption(stages: { name: string; value: number }[]) {
  const palette = [COLORS.azul, COLORS.azulClaro, COLORS.amarelo, COLORS.verde];
  return {
    backgroundColor: BG,
    tooltip: { ...tooltipDark, trigger: "item", formatter: "{b}: {c}" },
    series: [
      {
        type: "funnel",
        left: "6%",
        right: "6%",
        top: 10,
        bottom: 10,
        minSize: "20%",
        sort: "descending",
        gap: 4,
        label: { color: "#f0f0f0", fontSize: 12, formatter: "{b}\n{c}" },
        labelLine: { show: false },
        itemStyle: { borderColor: "rgba(0,0,0,0.3)", borderWidth: 1 },
        emphasis: { label: { fontSize: 13 } },
        data: stages.map((s, i) => ({
          ...s,
          itemStyle: { color: palette[i % palette.length] },
        })),
      },
    ],
  };
}

/** Heatmap regiões × temas (oportunidade Raio-X). */
export function heatmapOption(
  regions: string[],
  temas: string[],
  values: number[][],
) {
  // values[r][t] → [t, r, valor]
  const data: [number, number, number][] = [];
  for (let r = 0; r < regions.length; r++) {
    for (let t = 0; t < temas.length; t++) data.push([t, r, values[r][t]]);
  }
  return {
    backgroundColor: BG,
    tooltip: {
      ...tooltipDark,
      position: "top",
      formatter: (p: { value: [number, number, number] }) =>
        `${regions[p.value[1]]} · ${temas[p.value[0]]}: ${p.value[2]}`,
    },
    grid: { left: 110, right: 16, top: 8, bottom: 60 },
    xAxis: {
      type: "category",
      data: temas,
      axisLabel: { color: TXT, fontSize: 9, rotate: 35 },
      axisLine: { lineStyle: { color: GRID } },
      splitArea: { show: false },
    },
    yAxis: {
      type: "category",
      data: regions,
      axisLabel: { color: TXT, fontSize: 10 },
      axisLine: { lineStyle: { color: GRID } },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      textStyle: { color: TXT },
      inRange: {
        color: ["#142a1c", "#1e7a3e", "#22c55e", "#f0c030", "#ef4444"],
      },
    },
    series: [
      {
        type: "heatmap",
        data,
        label: { show: true, color: "#0f0f13", fontSize: 9, fontWeight: 600 },
        itemStyle: { borderColor: "#0f0f13", borderWidth: 1 },
        emphasis: {
          itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.5)" },
        },
      },
    ],
  };
}

/** Quadrante 2D: demanda × potencial de votos (bolha = urgência, cor = oportunidade). */
export function priorityScatterOption(matrix: MatrixPoint[]) {
  return {
    backgroundColor: BG,
    tooltip: {
      ...tooltipDark,
      formatter: (p: { data: { value: number[]; name: string } }) =>
        `<b>${p.data.name}</b><br/>Demanda: ${p.data.value[0]}<br/>Potencial: ${p.data.value[1]}<br/>Oportunidade: ${p.data.value[3]}`,
    },
    grid: { left: 48, right: 20, top: 20, bottom: 44 },
    xAxis: {
      name: "Demanda",
      nameTextStyle: { color: TXT },
      min: 0,
      max: 100,
      ...axisCommon,
      type: "value",
    },
    yAxis: {
      name: "Potencial de votos",
      nameTextStyle: { color: TXT },
      min: 0,
      max: 100,
      ...axisCommon,
      type: "value",
    },
    visualMap: {
      show: false,
      min: 0,
      max: 100,
      dimension: 3,
      inRange: { color: ["#3b82f6", "#22c55e", "#f0c030", "#ef4444"] },
    },
    series: [
      {
        type: "scatter",
        symbolSize: (val: number[]) => 10 + (val[2] / 100) * 34,
        data: matrix.map((m) => ({
          name: m.tema,
          value: [m.demanda, m.potencialVotos, m.urgencia, m.oportunidade],
        })),
        label: {
          show: true,
          formatter: "{b}",
          position: "top",
          color: TXT,
          fontSize: 9,
        },
        itemStyle: { opacity: 0.85, borderColor: "rgba(255,255,255,0.25)" },
      },
      // Linhas de referência (quadrantes) via markLine.
      {
        type: "scatter",
        data: [],
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "rgba(255,255,255,0.12)", type: "dashed" },
          data: [{ xAxis: 50 }, { yAxis: 50 }],
        },
      },
    ],
  };
}

/** Scatter 3D Raio-X: demanda × potencial × satisfação (cor = oportunidade). */
export function scatter3DOption(matrix: MatrixPoint[]) {
  return {
    backgroundColor: BG,
    tooltip: {
      ...tooltipDark,
      formatter: (p: { data: { name: string; value: number[] } }) =>
        `<b>${p.data.name}</b><br/>Demanda ${p.data.value[0]} · Potencial ${p.data.value[1]}<br/>Satisfação ${p.data.value[2]} · Oport. ${p.data.value[3]}`,
    },
    visualMap: {
      show: true,
      min: 0,
      max: 100,
      dimension: 3,
      left: 0,
      bottom: 10,
      textStyle: { color: TXT },
      inRange: { color: ["#3b82f6", "#22c55e", "#f0c030", "#ef4444"] },
    },
    xAxis3D: {
      name: "Demanda",
      type: "value",
      min: 0,
      max: 100,
      nameTextStyle: { color: TXT },
      axisLine: { lineStyle: { color: GRID } },
      axisLabel: { color: TXT },
    },
    yAxis3D: {
      name: "Potencial",
      type: "value",
      min: 0,
      max: 100,
      nameTextStyle: { color: TXT },
      axisLine: { lineStyle: { color: GRID } },
      axisLabel: { color: TXT },
    },
    zAxis3D: {
      name: "Satisfação",
      type: "value",
      min: 0,
      max: 100,
      nameTextStyle: { color: TXT },
      axisLine: { lineStyle: { color: GRID } },
      axisLabel: { color: TXT },
    },
    grid3D: {
      boxWidth: 100,
      boxDepth: 100,
      viewControl: { autoRotate: true, autoRotateSpeed: 8, distance: 200 },
      light: { main: { intensity: 1.2 }, ambient: { intensity: 0.4 } },
      axisPointer: { lineStyle: { color: GRID } },
      splitLine: { lineStyle: { color: GRID } },
      environment: "transparent",
    },
    series: [
      {
        type: "scatter3D",
        symbolSize: (val: number[]) => 8 + (val[2] / 100) * 22,
        data: matrix.map((m) => ({
          name: m.tema,
          value: [
            m.demanda,
            m.potencialVotos,
            m.satisfacaoAtual,
            m.oportunidade,
          ],
        })),
        emphasis: {
          label: { show: true, formatter: "{b}", textStyle: { color: "#fff" } },
        },
        itemStyle: { opacity: 0.9 },
      },
    ],
  };
}

/** Barras 3D: regiões × temas (altura = oportunidade). */
export function bar3DOption(
  regions: string[],
  temas: string[],
  values: number[][],
) {
  const data: [number, number, number][] = [];
  for (let r = 0; r < regions.length; r++) {
    for (let t = 0; t < temas.length; t++) data.push([t, r, values[r][t]]);
  }
  return {
    backgroundColor: BG,
    tooltip: { ...tooltipDark },
    visualMap: {
      max: 100,
      min: 0,
      show: false,
      dimension: 2,
      inRange: { color: ["#3b82f6", "#22c55e", "#f0c030", "#ef4444"] },
    },
    xAxis3D: {
      type: "category",
      data: temas,
      axisLabel: { color: TXT, fontSize: 9 },
      name: "Tema",
    },
    yAxis3D: {
      type: "category",
      data: regions,
      axisLabel: { color: TXT, fontSize: 9 },
      name: "Região",
    },
    zAxis3D: {
      type: "value",
      max: 100,
      axisLabel: { color: TXT },
      name: "Oport.",
    },
    grid3D: {
      boxWidth: 120,
      boxDepth: 80,
      viewControl: { autoRotate: true, autoRotateSpeed: 6, distance: 240 },
      light: { main: { intensity: 1.2 }, ambient: { intensity: 0.5 } },
      axisLine: { lineStyle: { color: GRID } },
      splitLine: { lineStyle: { color: GRID } },
    },
    series: [
      {
        type: "bar3D",
        data: data.map((d) => ({ value: d })),
        shading: "lambert",
        itemStyle: { opacity: 0.92 },
        emphasis: { label: { show: false } },
      },
    ],
  };
}

/** Cartograma/treemap das regiões (tamanho = eleitorado, cor = oportunidade). Clicável. */
export function regionsTreemapOption(
  data: { name: string; value: number; oportunidade: number; tema: string }[],
) {
  return {
    backgroundColor: BG,
    tooltip: {
      ...tooltipDark,
      formatter: (p: {
        name: string;
        value: number;
        data: { oportunidade: number; tema: string };
      }) =>
        `<b>${p.name}</b><br/>Eleitorado: ${Number(p.value).toLocaleString("pt-BR")}<br/>Prioridade: ${p.data.tema}<br/>Oportunidade: ${p.data.oportunidade}`,
    },
    series: [
      {
        type: "treemap",
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          color: "#0f0f13",
          fontWeight: 700,
          fontSize: 11,
          formatter: "{b}",
        },
        upperLabel: { show: false },
        itemStyle: { borderColor: "#0f0f13", borderWidth: 2, gapWidth: 2 },
        levels: [
          {
            color: ["#1e7a3e", "#22c55e", "#f0c030", "#fb923c", "#ef4444"],
            colorMappingBy: "value",
          },
        ],
        data: data.map((d) => ({
          name: d.name,
          value: d.value,
          oportunidade: d.oportunidade,
          tema: d.tema,
          itemStyle: { color: opportunityColor(d.oportunidade) },
        })),
      },
    ],
  };
}

function opportunityColor(o: number): string {
  if (o >= 55) return "#ef4444";
  if (o >= 42) return "#fb923c";
  if (o >= 30) return "#f0c030";
  if (o >= 20) return "#22c55e";
  return "#1e7a3e";
}
