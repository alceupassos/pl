import {
  Chart,
  type ChartConfiguration,
  type ChartType,
  type ScriptableContext,
} from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

import type { RegionId, Series } from "@/lib/mock/types";
import * as M from "@/lib/mock/campaign-metrics";
import { driftValue } from "@/lib/mock/live-drift";

// Registramos o plugin de datalabels uma vez, porém desligado por padrão —
// cada gráfico habilita explicitamente onde agrega valor.
Chart.register(ChartDataLabels);
Chart.defaults.plugins.datalabels = { display: false } as never;
Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";
Chart.defaults.color = "#8a8aaa";

const charts = new Map<string, Chart>();
const GRID = "rgba(255,255,255,0.06)";
const TICK = "#8a8aaa";

// Respeita prefers-reduced-motion — animações de canvas não são cobertas por CSS.
const baseAnimation = () => ({
  duration:
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 700,
  easing: "easeOutQuart" as const,
});

// Configs são reconstruídos a cada render, então o viewport é reamostrado
// naturalmente (rotação de tela, resize).
const isMobileViewport = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 768px)").matches;

const tooltipStyle = {
  backgroundColor: "rgba(16,16,24,0.95)",
  borderColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  titleColor: "#f0f0f0",
  bodyColor: "#c9c9da",
  usePadding: true,
};

function legendStyle() {
  const mobile = isMobileViewport();
  return {
    display: true,
    position: "bottom" as const,
    labels: {
      color: "#9a9ab2",
      usePointStyle: true,
      pointStyle: "circle" as const,
      boxWidth: 8,
      padding: mobile ? 8 : 14,
      font: { size: mobile ? 9 : 10 },
    },
  };
}

function hexToRgba(color: string, alpha: number): string {
  if (color.startsWith("rgba") || color.startsWith("rgb")) return color;
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function barGradient(ctx: ScriptableContext<"bar">, color: string) {
  const { ctx: c, chartArea } = ctx.chart;
  if (!chartArea) return hexToRgba(color, 0.85);
  const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  grad.addColorStop(0, hexToRgba(color, 0.95));
  grad.addColorStop(1, hexToRgba(color, 0.45));
  return grad;
}

function verticalGradient(ctx: ScriptableContext<"line">, color: string) {
  const { chart } = ctx;
  const { ctx: c, chartArea } = chart;
  if (!chartArea) return hexToRgba(color, 0.12);
  const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  grad.addColorStop(0, hexToRgba(color, 0.34));
  grad.addColorStop(1, hexToRgba(color, 0.01));
  return grad;
}

function cartesianScales() {
  const mobile = isMobileViewport();
  const fontSize = mobile ? 9 : 10;
  return {
    x: {
      grid: { color: GRID, drawTicks: false },
      ticks: {
        color: TICK,
        font: { size: fontSize },
        autoSkip: true,
        maxRotation: 0,
        ...(mobile ? { maxTicksLimit: 6 } : {}),
      },
      border: { display: false },
    },
    y: {
      grid: { color: GRID, drawTicks: false },
      ticks: { color: TICK, font: { size: fontSize } },
      border: { display: false },
    },
  };
}

type LineOpts = { area?: boolean; legend?: boolean };

function lineConfig(series: Series, opts: LineOpts = {}): ChartConfiguration {
  const multi = series.datasets.length > 1;
  return {
    type: "line",
    data: {
      labels: series.labels,
      datasets: series.datasets.map((ds) => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.color,
        backgroundColor: opts.area
          ? (ctx: ScriptableContext<"line">) => verticalGradient(ctx, ds.color)
          : hexToRgba(ds.color, 0.1),
        fill: !!opts.area,
        tension: 0.4,
        borderWidth: 2.5,
        pointBackgroundColor: ds.color,
        pointBorderColor: "rgba(0,0,0,0.25)",
        pointRadius: 0,
        pointHoverRadius: 5,
        spanGaps: true,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 120,
      animation: baseAnimation(),
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: opts.legend || multi ? legendStyle() : { display: false },
        tooltip: tooltipStyle,
        datalabels: { display: false },
      },
      scales: cartesianScales(),
    },
  };
}

type BarOpts = {
  horizontal?: boolean;
  legend?: boolean;
  datalabels?: boolean;
  stacked?: boolean;
};

function barConfig(series: Series, opts: BarOpts = {}): ChartConfiguration {
  const multi = series.datasets.length > 1;
  return {
    type: "bar",
    data: {
      labels: series.labels,
      datasets: series.datasets.map((ds) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor:
          ds.palette ??
          ((ctx: ScriptableContext<"bar">) => barGradient(ctx, ds.color)),
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: 46,
      })),
    },
    options: {
      indexAxis: opts.horizontal ? "y" : "x",
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 120,
      animation: baseAnimation(),
      plugins: {
        legend: opts.legend || multi ? legendStyle() : { display: false },
        tooltip: tooltipStyle,
        datalabels: opts.datalabels
          ? {
              display: true,
              anchor: "end",
              align: opts.horizontal ? "right" : "top",
              color: "#c9c9da",
              font: { size: 9, weight: 600 },
              formatter: (v: number) =>
                typeof v === "number" ? v.toLocaleString("pt-BR") : v,
            }
          : { display: false },
      },
      scales: opts.stacked
        ? (() => {
            const scales = cartesianScales();
            return {
              x: { ...scales.x, stacked: true },
              y: { ...scales.y, stacked: true },
            };
          })()
        : cartesianScales(),
    },
  };
}

function doughnutConfig(series: Series): ChartConfiguration {
  const ds = series.datasets[0];
  return {
    type: "doughnut",
    data: {
      labels: series.labels,
      datasets: [
        {
          data: ds.data,
          backgroundColor: ds.palette ?? [ds.color],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 120,
      animation: baseAnimation(),
      plugins: {
        legend: legendStyle(),
        tooltip: {
          ...tooltipStyle,
          callbacks: {
            label: (item) => ` ${item.label}: ${item.parsed}%`,
          },
        },
        datalabels: { display: false },
      },
    },
  };
}

// Mapa: seção → [ {canvasId, config} ] construído a partir da camada de mock,
// já filtrado pela região ativa.
function buildConfigs(
  sectionId: string,
  region: RegionId,
): { id: string; config: ChartConfiguration }[] {
  switch (sectionId) {
    // Caso legado — a seção dashboard hoje é React/ECharts (DashboardSection).
    case "dashboard":
      return [
        {
          id: "cEvolucao",
          config: lineConfig(M.getIntencaoEvolution(region), { area: true }),
        },
        { id: "cFaixa", config: doughnutConfig(M.getFaixaEtaria(region)) },
      ];
    case "pesquisas":
      return [
        {
          id: "cInstitutos",
          config: barConfig(M.getPesquisasInstitutos(region), {
            datalabels: true,
          }),
        },
        {
          id: "cHistPeq",
          config: lineConfig(M.getPesquisasHistorico(region), { legend: true }),
        },
      ];
    case "territorios":
      return [
        {
          id: "cIdade",
          config: barConfig(M.getTerritoriosIdade(region), {
            datalabels: true,
          }),
        },
        {
          id: "cFlutuacao",
          config: lineConfig(M.getFlutuacao(region), { legend: true }),
        },
      ];
    case "concorrentes":
      return [
        {
          id: "cConcor",
          config: barConfig(M.getConcorrentes(region), { legend: true }),
        },
      ];
    case "redes":
      return [
        {
          id: "cRedes",
          config: lineConfig(M.getRedesCrescimento(region), { legend: true }),
        },
        {
          id: "cSentimento",
          config: doughnutConfig(M.getSentimentoRedes(region)),
        },
      ];
    case "diario":
      return [
        { id: "cDiario", config: barConfig(M.getDiarioAtividades(region)) },
      ];
    case "ia":
      return [
        {
          id: "cProjecao",
          config: lineConfig(M.getProjecaoIa(region), { legend: true }),
        },
      ];
    case "demandas":
      return [
        {
          id: "cDemandas",
          config: barConfig(M.getDemandas(region), {
            horizontal: true,
            datalabels: true,
          }),
        },
      ];
    case "financeiro":
      return [
        {
          id: "cExecucao",
          config: lineConfig(M.getFinanceiroExecucao(), {
            area: true,
            legend: true,
          }),
        },
        { id: "cFontes", config: doughnutConfig(M.getFinanceiroFontes()) },
      ];
    case "crm":
      return [
        {
          id: "cCrmMunicipio",
          config: barConfig(M.getCrmMunicipio(region), { legend: true }),
        },
      ];
    case "comunicacao":
      return [
        {
          id: "cEngajamento",
          config: lineConfig(M.getComunicacaoEngajamento(), { legend: true }),
        },
      ];
    case "meta":
      return [
        {
          id: "cMetaRegiao",
          config: barConfig(M.getMetaPorRegiao(), { legend: true }),
        },
      ];
    default:
      return [];
  }
}

export function destroyCharts() {
  charts.forEach((chart) => chart.destroy());
  charts.clear();
}

export function renderSectionCharts(
  sectionId: string,
  region: RegionId = "all",
) {
  destroyCharts();
  const specs = buildConfigs(sectionId, region);
  specs.forEach(({ id, config }) => {
    const element = document.getElementById(id) as HTMLCanvasElement | null;
    if (!element) return;
    charts.set(id, new Chart(element, config as ChartConfiguration<ChartType>));
  });
}

// Deriva os dados de um config recém-construído (nunca compartilhado, mutação ok).
function driftConfigData(config: ChartConfiguration, tick: number) {
  config.data.datasets.forEach((ds, datasetIndex) => {
    ds.data = (ds.data as (number | null)[]).map((value, pointIndex) =>
      typeof value === "number"
        ? driftValue(value, tick, `${ds.label ?? datasetIndex}:${pointIndex}`, 0.025)
        : value,
    );
  });
  return config;
}

/**
 * Atualização "ao vivo": muda só os dados dos gráficos existentes e chama
 * `chart.update()` (transição animada), em vez do destrói-e-recria do
 * `renderSectionCharts`. Se o canvas foi substituído (HTML reinjetado),
 * recria o gráfico.
 */
export function updateSectionCharts(
  sectionId: string,
  region: RegionId = "all",
  tick = 0,
) {
  const specs = buildConfigs(sectionId, region);
  specs.forEach(({ id, config }) => {
    const drifted = driftConfigData(config, tick);
    const existing = charts.get(id);

    if (existing && existing.canvas.isConnected) {
      existing.data.labels = drifted.data.labels;
      // Substitui apenas `data` de cada dataset — a identidade do objeto é
      // preservada para não perder backgrounds scriptable (gradientes).
      existing.data.datasets.forEach((dataset, index) => {
        const next = drifted.data.datasets[index];
        if (next) dataset.data = next.data;
      });
      // Fecha tooltip aberto por toque — no mobile ele mostraria números antigos.
      existing.setActiveElements([]);
      existing.tooltip?.setActiveElements([], { x: 0, y: 0 });
      existing.update();
      return;
    }

    if (existing) {
      existing.destroy();
      charts.delete(id);
    }
    const element = document.getElementById(id) as HTMLCanvasElement | null;
    if (!element) return;
    charts.set(
      id,
      new Chart(element, drifted as ChartConfiguration<ChartType>),
    );
  });
}
