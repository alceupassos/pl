// Fábricas de `option` (ECharts / echarts-gl) para a vitrine do /basecalculo.
// 6 gráficos que provam visualmente que o Índice de Popularidade Digital está
// certo. Tipos LOCAIS serializáveis (não importam lib/index-real — server-only).
// Cada builder tem versão 3D (echarts-gl) e fallback 2D (useIs3D=false).

// import type: apagado no build — não traz código server (lib/index-real usa fs).
import type { Ingrediente, LinhaIndice } from "@/lib/index-real";

export type Linha3D = LinhaIndice;
export type SeriePonto = { t: number; v: number };
export type SeriesScore = Record<string, SeriePonto[]>;

type Opt = Record<string, unknown>;

const TXT = "#8a8aaa";
const GRID = "rgba(255,255,255,0.08)";
const BG = "transparent";
const RAMP = ["#3b82f6", "#22c55e", "#f0c030", "#ef4444"];
const INGS = ["mencoes", "sentimento", "imprensa", "seguidores"] as const;
const ING_LABEL: Record<string, string> = {
  mencoes: "Menções",
  sentimento: "Sentimento",
  imprensa: "Imprensa",
  seguidores: "Seguidores",
};

const grid3D = {
  boxWidth: 110,
  boxDepth: 90,
  viewControl: { autoRotate: true, autoRotateSpeed: 7, distance: 220 },
  light: { main: { intensity: 1.2 }, ambient: { intensity: 0.5 } },
  axisLine: { lineStyle: { color: GRID } },
  splitLine: { lineStyle: { color: GRID } },
  axisPointer: { lineStyle: { color: GRID } },
  environment: "transparent",
};
const tooltipDark = {
  backgroundColor: "rgba(16,16,24,0.96)",
  borderColor: "rgba(255,255,255,0.08)",
  textStyle: { color: "#e6e6f0", fontSize: 12 },
};

const nota = (l: Linha3D, k: Ingrediente): number => l.ingredientes[k]?.nota ?? 0;

/** Série efetiva: usa o histórico; se vazio, semeia 2 pontos planos no Score. */
function effSerie(l: Linha3D, series: SeriesScore, now: number): SeriePonto[] {
  const s = series[l.simbolo];
  if (s && s.length >= 2) return s;
  const v = l.score ?? 100;
  return [
    { t: now - 3600_000, v },
    { t: now, v },
  ];
}

// ── 1. bar3D — matriz de notas (candidatos × ingredientes × nota) ─────────────
export function matrizNotas3D(linhas: Linha3D[]): Opt {
  const data: { value: [number, number, number] }[] = [];
  linhas.forEach((l, yi) =>
    INGS.forEach((k, xi) => data.push({ value: [xi, yi, nota(l, k)] })),
  );
  return {
    backgroundColor: BG,
    tooltip: { ...tooltipDark },
    visualMap: { show: false, min: 0, max: 100, dimension: 2, inRange: { color: RAMP } },
    xAxis3D: { type: "category", data: INGS.map((k) => ING_LABEL[k]), axisLabel: { color: TXT, fontSize: 9 }, name: "Pilar" },
    yAxis3D: { type: "category", data: linhas.map((l) => l.simbolo), axisLabel: { color: TXT, fontSize: 9 }, name: "Candidato" },
    zAxis3D: { type: "value", min: 0, max: 100, axisLabel: { color: TXT }, name: "Nota" },
    grid3D,
    series: [{ type: "bar3D", data, shading: "lambert", itemStyle: { opacity: 0.92 } }],
  };
}
export function matrizNotas2D(linhas: Linha3D[]): Opt {
  return {
    backgroundColor: BG,
    tooltip: { ...tooltipDark, trigger: "axis" },
    legend: { textStyle: { color: TXT }, top: 0 },
    grid: { left: 36, right: 12, top: 28, bottom: 24 },
    xAxis: { type: "category", data: linhas.map((l) => l.simbolo), axisLabel: { color: TXT } },
    yAxis: { type: "value", min: 0, max: 100, axisLabel: { color: TXT }, splitLine: { lineStyle: { color: GRID } } },
    series: INGS.map((k, i) => ({
      name: ING_LABEL[k],
      type: "bar",
      data: linhas.map((l) => nota(l, k)),
      itemStyle: { color: RAMP[i] },
    })),
  };
}

// ── 2. scatter3D — posicionamento multidimensional ────────────────────────────
export function posicionamento3D(linhas: Linha3D[]): Opt {
  return {
    backgroundColor: BG,
    tooltip: {
      ...tooltipDark,
      formatter: (p: { data: { name: string; value: number[] } }) =>
        `<b>${p.data.name}</b><br/>Menções ${p.data.value[0]} · Sentimento ${p.data.value[1]}<br/>Imprensa ${p.data.value[2]} · Posição ${p.data.value[4]}`,
    },
    visualMap: { show: true, min: 70, max: 130, dimension: 4, left: 0, bottom: 8, textStyle: { color: TXT }, inRange: { color: RAMP } },
    xAxis3D: { name: "Menções", type: "value", min: 0, max: 100, nameTextStyle: { color: TXT }, axisLabel: { color: TXT }, axisLine: { lineStyle: { color: GRID } } },
    yAxis3D: { name: "Sentimento", type: "value", min: 0, max: 100, nameTextStyle: { color: TXT }, axisLabel: { color: TXT }, axisLine: { lineStyle: { color: GRID } } },
    zAxis3D: { name: "Imprensa", type: "value", min: 0, max: 100, nameTextStyle: { color: TXT }, axisLabel: { color: TXT }, axisLine: { lineStyle: { color: GRID } } },
    grid3D,
    series: [
      {
        type: "scatter3D",
        symbolSize: (v: number[]) => 10 + (v[3] / 100) * 26,
        data: linhas.map((l) => ({
          name: l.simbolo,
          value: [nota(l, "mencoes"), nota(l, "sentimento"), nota(l, "imprensa"), nota(l, "seguidores"), l.posicao ?? 100],
        })),
        emphasis: { label: { show: true, formatter: "{b}", textStyle: { color: "#fff" } } },
        itemStyle: { opacity: 0.9 },
      },
    ],
  };
}
export function posicionamento2D(linhas: Linha3D[]): Opt {
  return {
    backgroundColor: BG,
    tooltip: { ...tooltipDark },
    grid: { left: 40, right: 16, top: 16, bottom: 36 },
    xAxis: { name: "Menções", type: "value", min: 0, max: 100, nameTextStyle: { color: TXT }, axisLabel: { color: TXT }, splitLine: { lineStyle: { color: GRID } } },
    yAxis: { name: "Sentimento", type: "value", min: 0, max: 100, nameTextStyle: { color: TXT }, axisLabel: { color: TXT }, splitLine: { lineStyle: { color: GRID } } },
    series: [
      {
        type: "scatter",
        symbolSize: (v: number[]) => 10 + (v[2] / 100) * 24,
        data: linhas.map((l) => ({ name: l.simbolo, value: [nota(l, "mencoes"), nota(l, "sentimento"), nota(l, "seguidores")], itemStyle: { color: l.cor } })),
        label: { show: true, formatter: "{b}", position: "top", color: TXT, fontSize: 9 },
      },
    ],
  };
}

// ── 3. line3D — trajetória temporal do Score (uma linha por candidato) ────────
export function trajetoriaScore3D(linhas: Linha3D[], series: SeriesScore, now: number): Opt {
  return {
    backgroundColor: BG,
    tooltip: { ...tooltipDark },
    xAxis3D: { type: "value", name: "tempo", axisLabel: { show: false }, axisLine: { lineStyle: { color: GRID } } },
    yAxis3D: { type: "value", name: "candidato", min: -0.5, max: linhas.length - 0.5, axisLabel: { color: TXT, formatter: (v: number) => linhas[Math.round(v)]?.simbolo ?? "" }, axisLine: { lineStyle: { color: GRID } } },
    zAxis3D: { type: "value", name: "Score", axisLabel: { color: TXT }, axisLine: { lineStyle: { color: GRID } } },
    grid3D,
    series: linhas.map((l, yi) => ({
      type: "line3D",
      lineStyle: { color: l.cor, width: 3, opacity: 0.9 },
      data: effSerie(l, series, now).map((p) => [p.t, yi, p.v]),
    })),
  };
}
export function trajetoriaScore2D(linhas: Linha3D[], series: SeriesScore, now: number): Opt {
  return {
    backgroundColor: BG,
    tooltip: { ...tooltipDark, trigger: "axis" },
    legend: { textStyle: { color: TXT }, top: 0, type: "scroll" },
    grid: { left: 36, right: 12, top: 28, bottom: 24 },
    xAxis: { type: "time", axisLabel: { color: TXT } },
    yAxis: { type: "value", name: "Score", axisLabel: { color: TXT }, splitLine: { lineStyle: { color: GRID } } },
    series: linhas.map((l) => ({
      name: l.simbolo,
      type: "line",
      smooth: true,
      symbol: "none",
      lineStyle: { color: l.cor },
      data: effSerie(l, series, now).map((p) => [p.t, p.v]),
    })),
  };
}

// ── 4. surface — paisagem do Score (passos × candidato) ───────────────────────
export function paisagemScore3D(linhas: Linha3D[], series: SeriesScore, now: number): Opt {
  const K = 20;
  const grid: [number, number, number][] = [];
  linhas.forEach((l, yi) => {
    const s = effSerie(l, series, now);
    for (let x = 0; x < K; x++) {
      const idx = Math.min(s.length - 1, Math.round((x / (K - 1)) * (s.length - 1)));
      grid.push([x, yi, s[idx]?.v ?? l.score ?? 100]);
    }
  });
  return {
    backgroundColor: BG,
    tooltip: { ...tooltipDark },
    visualMap: { show: false, dimension: 2, min: 60, max: 140, inRange: { color: RAMP } },
    xAxis3D: { type: "value", name: "tempo", axisLabel: { show: false }, axisLine: { lineStyle: { color: GRID } } },
    yAxis3D: { type: "value", name: "candidato", min: 0, max: linhas.length - 1, axisLabel: { color: TXT, formatter: (v: number) => linhas[Math.round(v)]?.simbolo ?? "" }, axisLine: { lineStyle: { color: GRID } } },
    zAxis3D: { type: "value", name: "Score", axisLabel: { color: TXT }, axisLine: { lineStyle: { color: GRID } } },
    grid3D,
    series: [{ type: "surface", wireframe: { show: true }, shading: "color", data: grid }],
  };
}

// ── 5. bar3D empilhado — anatomia do Score (contribuição nota×peso) ───────────
export function contribuicao3D(linhas: Linha3D[], pesos: Record<Ingrediente, number>): Opt {
  const data: { value: [number, number, number]; itemStyle: { color: string } }[] = [];
  linhas.forEach((l, yi) =>
    INGS.forEach((k, xi) => {
      const contrib = (l.ingredientes[k]?.nota ?? 0) * (pesos[k] ?? 0);
      data.push({ value: [xi, yi, Math.round(contrib * 10) / 10], itemStyle: { color: RAMP[xi] } });
    }),
  );
  return {
    backgroundColor: BG,
    tooltip: {
      ...tooltipDark,
      formatter: (p: { value: number[] }) =>
        `${ING_LABEL[INGS[p.value[0]]]} · ${linhas[p.value[1]]?.simbolo}<br/>contribuição ${p.value[2]} pts`,
    },
    xAxis3D: { type: "category", data: INGS.map((k) => ING_LABEL[k]), axisLabel: { color: TXT, fontSize: 9 }, name: "Pilar" },
    yAxis3D: { type: "category", data: linhas.map((l) => l.simbolo), axisLabel: { color: TXT, fontSize: 9 }, name: "Candidato" },
    zAxis3D: { type: "value", axisLabel: { color: TXT }, name: "nota×peso" },
    grid3D,
    series: [{ type: "bar3D", data, shading: "lambert", itemStyle: { opacity: 0.95 } }],
  };
}
export function contribuicao2D(linhas: Linha3D[], pesos: Record<Ingrediente, number>): Opt {
  return {
    backgroundColor: BG,
    tooltip: { ...tooltipDark, trigger: "axis" },
    legend: { textStyle: { color: TXT }, top: 0 },
    grid: { left: 36, right: 12, top: 28, bottom: 24 },
    xAxis: { type: "category", data: linhas.map((l) => l.simbolo), axisLabel: { color: TXT } },
    yAxis: { type: "value", name: "Score", axisLabel: { color: TXT }, splitLine: { lineStyle: { color: GRID } } },
    series: INGS.map((k, i) => ({
      name: ING_LABEL[k],
      type: "bar",
      stack: "score",
      data: linhas.map((l) => Math.round((l.ingredientes[k]?.nota ?? 0) * (pesos[k] ?? 0) * 10) / 10),
      itemStyle: { color: RAMP[i] },
    })),
  };
}

// ── 6. scatterGL — Score × Posição (glow): prova Posição = Score/média×100 ────
export function scoreVsPosicao(linhas: Linha3D[]): Opt {
  const pts = linhas.filter((l) => l.score != null && l.posicao != null);
  return {
    backgroundColor: BG,
    tooltip: {
      ...tooltipDark,
      formatter: (p: { data: { name: string; value: number[] } }) =>
        `<b>${p.data.name}</b><br/>Score ${p.data.value[0]} → Posição ${p.data.value[1]}`,
    },
    grid: { left: 44, right: 16, top: 16, bottom: 36 },
    xAxis: { name: "Score", type: "value", scale: true, nameTextStyle: { color: TXT }, axisLabel: { color: TXT }, splitLine: { lineStyle: { color: GRID } } },
    yAxis: { name: "Posição", type: "value", scale: true, nameTextStyle: { color: TXT }, axisLabel: { color: TXT }, splitLine: { lineStyle: { color: GRID } } },
    series: [
      {
        type: "scatterGL",
        symbolSize: 22,
        itemStyle: { opacity: 0.95, color: "#22d3ee" },
        // glow
        emphasis: { itemStyle: { color: "#67e8f9" } },
        data: pts.map((l) => ({ name: l.simbolo, value: [l.score, l.posicao], itemStyle: { color: l.cor } })),
        label: { show: true, formatter: "{b}", position: "right", color: TXT, fontSize: 10 },
      },
      {
        // reta de referência y = x/média×100 ≈ tendência linear (visual)
        type: "line",
        symbol: "none",
        lineStyle: { color: "rgba(34,211,238,0.4)", type: "dashed" },
        data: (() => {
          const xs = pts.map((l) => l.score as number);
          const min = Math.min(...xs, 0);
          const max = Math.max(...xs, 1);
          const mean = xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
          return [
            [min, (min / mean) * 100],
            [max, (max / mean) * 100],
          ];
        })(),
      },
    ],
  };
}
export function scoreVsPosicao2D(linhas: Linha3D[]): Opt {
  // mesma ideia sem GL (scatter comum)
  const o = scoreVsPosicao(linhas) as { series: { type: string }[] };
  o.series[0].type = "scatter";
  return o as Opt;
}
