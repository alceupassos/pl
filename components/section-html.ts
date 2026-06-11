// Camada híbrida: gera o HTML das seções "dashboard" a partir da mesma fonte
// de mock (camada RJ), já filtrado pela região ativa. Seções ainda não
// migradas caem no HTML estático existente em campaign-data.ts.

import { campaignSections } from "@/components/campaign-data";
import watchlist from "@/data/watchlist.json";
import type { Kpi, RegionId } from "@/lib/mock/types";
import { REGIONS, getRegion, regionEleitorado } from "@/lib/mock/rj-regions";
import * as M from "@/lib/mock/campaign-metrics";

const KPI_COLORS = ["#22c55e", "#60a5fa", "#f59e0b", "#8b5cf6"];

function trendClass(trend?: Kpi["trend"]) {
  return trend === "up" ? "up" : trend === "down" ? "down" : "";
}
function trendIcon(trend?: Kpi["trend"]) {
  return trend === "up" ? "▲" : trend === "down" ? "▼" : "•";
}

function kpiRow(kpis: Kpi[]): string {
  return `<div class="kpi-row">${kpis
    .map(
      (k, i) => `
      <div class="kpi-card">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value" style="color:${KPI_COLORS[i % KPI_COLORS.length]};">${k.valor}</div>
        <div class="kpi-sub ${trendClass(k.trend)}">${k.delta ? `${trendIcon(k.trend)} ${k.delta}` : ""}</div>
      </div>`,
    )
    .join("")}</div>`;
}

function chartCard(
  title: string,
  badge: string,
  canvasId: string,
  height = 220,
): string {
  return `
    <div class="card">
      <div class="card-header"><div class="card-title">${title}</div><span class="card-badge-group"><span class="card-badge badge-azul">${badge}</span><span class="card-badge card-live-meta" title="Última atualização"><span class="dot-live" aria-hidden="true"></span> <span data-live-updated>agora</span></span></span></div>
      <div class="chart-wrap" style="height:${height}px;"><canvas id="${canvasId}"></canvas></div>
    </div>`;
}

function table(headers: string[], rows: string[][]): string {
  return `<table class="tbl"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

const nf = (n: number) => n.toLocaleString("pt-BR");

function regionBanner(region: RegionId): string {
  const r = getRegion(region);
  const nome = r ? r.nome : "Todo o RJ";
  const apelido = r ? r.apelido : "Estado consolidado";
  return `<div class="region-banner"><i data-lucide="map-pin"></i> <strong>${nome}</strong> · ${apelido}</div>`;
}

// ---------------------------------------------------------------------------

function dashboard(region: RegionId): string {
  const r = getRegion(region);
  const cobertura = r ? r.cobertura : 47;
  const municipios = r
    ? r.municipios
    : REGIONS.flatMap((reg) => reg.municipios);
  const topMun = [...municipios]
    .sort((a, b) => b.cobertura - a.cobertura)
    .slice(0, 5);
  const munRows = topMun.map((m) => [
    m.nome,
    m.eleitorado ? nf(m.eleitorado) : "—",
    `${m.cobertura}%`,
  ]);

  return `<div id="sec-dashboard" class="section active">
    ${regionBanner(region)}
    ${kpiRow(M.getDashboardKpis(region))}
    <div class="grid-7-5" style="margin-top:12px;">
      ${chartCard("Evolução da Intenção de Voto — 2026", "série mockada", "cEvolucao", 240)}
      ${chartCard("Perfil do Eleitor", "faixa etária", "cFaixa", 240)}
    </div>
    <div class="grid2" style="margin-top:12px;">
      <div class="card">
        <div class="card-header"><div class="card-title">Top Municípios por Cobertura</div><span class="card-badge badge-real">campo</span></div>
        ${table(["Município", "Eleitorado", "Cobertura"], munRows)}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Saúde da Campanha</div><span class="card-badge badge-est">indicadores</span></div>
        <div class="detail-list">
          <div class="detail-row"><span>Cobertura territorial</span><span style="color:var(--branco);font-weight:600;">${cobertura}%</span></div>
          <div class="detail-row"><span>Cabos eleitorais ativos</span><span style="color:var(--branco);font-weight:600;">${r ? r.cabos : M.getDashboardKpis(region).length}</span></div>
          <div class="detail-row"><span>Sentimento positivo</span><span style="color:var(--branco);font-weight:600;">${r ? r.sentimento.positivo : 60}%</span></div>
          <div class="detail-row"><span>Compliance TSE</span><span style="color:var(--branco);font-weight:600;">92%</span></div>
        </div>
      </div>
    </div>
  </div>`;
}

function pesquisas(region: RegionId): string {
  const inst = M.getPesquisasInstitutos(region);
  const rows = inst.labels.map((label, i) => [
    label,
    `${inst.datasets[0].data[i]}%`,
    "±2.3%",
  ]);
  const kpis: Kpi[] = [
    {
      label: "Institutos ativos",
      valor: String(inst.labels.length),
      trend: "flat",
    },
    {
      label: "Melhor resultado",
      valor: `${Math.max(...(inst.datasets[0].data as number[]))}%`,
      delta: "líder regional",
      trend: "up",
    },
    {
      label: "Média dos institutos",
      valor: `${((inst.datasets[0].data as number[]).reduce((s, v) => s + v, 0) / inst.labels.length).toFixed(1)}%`,
      trend: "up",
      delta: "+0.4 p.p.",
    },
    { label: "Margem de erro", valor: "±2.3%", trend: "flat" },
  ];
  return `<div id="sec-pesquisas" class="section active">
    ${regionBanner(region)}
    ${kpiRow(kpis)}
    <div class="grid-7-5" style="margin-top:12px;">
      ${chartCard("Ranking por Instituto", "% intenção", "cInstitutos", 240)}
      ${chartCard("Histórico de Pesquisas 2026", "evolução", "cHistPeq", 240)}
    </div>
    <div class="card" style="margin-top:12px;">
      <div class="card-header"><div class="card-title">Detalhamento por Instituto</div><span class="card-badge badge-real">amostragem</span></div>
      ${table(["Instituto", "Intenção", "Margem"], rows)}
    </div>
  </div>`;
}

function territorios(region: RegionId): string {
  const r = getRegion(region);
  const bairros = r
    ? r.bairrosDestaque
    : REGIONS.flatMap((reg) => reg.bairrosDestaque).slice(0, 12);
  const municipiosAtivos = r
    ? r.municipios.length
    : REGIONS.reduce((s, reg) => s + reg.municipios.length, 0);
  const eleitorado = r
    ? regionEleitorado(r)
    : REGIONS.reduce((s, reg) => s + regionEleitorado(reg), 0);
  const kpis: Kpi[] = [
    {
      label: "Bairros mapeados",
      valor: String(bairros.length),
      trend: "up",
      delta: "+8 no mês",
    },
    {
      label: "Municípios ativos",
      valor: String(municipiosAtivos),
      trend: "flat",
    },
    {
      label: "Cabos eleitorais",
      valor: String(r ? r.cabos : REGIONS.reduce((s, reg) => s + reg.cabos, 0)),
      trend: "up",
      delta: "+24",
    },
    {
      label: "Cobertura média",
      valor: `${r ? r.cobertura : Math.round(REGIONS.reduce((s, reg) => s + reg.cobertura, 0) / REGIONS.length)}%`,
      trend: "up",
      delta: "+5 p.p.",
    },
  ];
  const bairrosGrid = bairros
    .map(
      (b) =>
        `<div class="bairro-chip"><span>${b.nome}</span><strong style="color:${b.valor >= 60 ? "#22c55e" : b.valor >= 45 ? "#f59e0b" : "#ef4444"};">${b.valor}%</strong></div>`,
    )
    .join("");
  return `<div id="sec-territorios" class="section active">
    ${regionBanner(region)}
    ${kpiRow(kpis)}
    <div class="card" style="margin-top:12px;">
      <div class="card-header"><div class="card-title">Bairros & Localidades — Desempenho</div><span class="card-badge badge-est">penetração</span><span class="card-badge badge-cinza">${eleitorado ? nf(eleitorado) + " eleitores" : ""}</span></div>
      <div class="bairro-grid">${bairrosGrid}</div>
    </div>
    <div class="grid-7-5" style="margin-top:12px;">
      ${chartCard("Aprovação por Faixa Etária", "região", "cIdade", 220)}
      ${chartCard("Flutuação por Município — 4 semanas", "tendência", "cFlutuacao", 220)}
    </div>
  </div>`;
}

function concorrentes(region: RegionId): string {
  const r = getRegion(region);
  const posicao = r ? r.posicao : 4;
  const intencao = r ? r.intencaoVoto : M.getDashboardKpis(region)[0].valor;
  const intStr = typeof intencao === "string" ? intencao : `${intencao}%`;
  const ranking = [
    {
      pos: "1°",
      nome: "Laura Carneiro",
      partido: "PSD",
      int: "10.5%",
      foto: "candidatos/laura_carneiro_psd.png",
      nos: false,
    },
    {
      pos: "2°",
      nome: "Marcelo Crivella",
      partido: "Republicanos",
      int: "9.8%",
      foto: "candidatos/marcelo_crivela_republicanos.png",
      nos: false,
    },
    {
      pos: "3°",
      nome: "Dr. Luizinho",
      partido: "PSB",
      int: "9.1%",
      foto: "candidatos/dr_luizinho_psb.png",
      nos: false,
    },
    {
      pos: `${posicao}°`,
      nome: "Renato Araújo (nós)",
      partido: "PL",
      int: intStr,
      foto: "candidatos/renato_araujo_PL.png",
      nos: true,
    },
    {
      pos: "6°",
      nome: "Jorginho Brum",
      partido: "MDB",
      int: "7.4%",
      foto: "candidatos/jorginho_brum.png",
      nos: false,
    },
  ];
  const rankingHtml = `<div class="conc-list">${ranking
    .map(
      (c) => `<div class="conc-row${c.nos ? " nos" : ""}">
      <span class="conc-pos">${c.pos}</span>
      <span class="conc-photo-wrap"><img class="conc-photo" src="${c.foto}" alt="${c.nome}" loading="lazy" /></span>
      <span class="conc-name">${c.nome}<small>${c.partido}</small></span>
      <span class="conc-int">${c.int}</span>
    </div>`,
    )
    .join("")}</div>`;
  const kpis: Kpi[] = [
    { label: "Concorrentes monitorados", valor: "24", trend: "flat" },
    {
      label: "Nosso ranking",
      valor: `#${posicao}`,
      trend: posicao <= 4 ? "up" : "down",
    },
    { label: "Maior ameaça regional", valor: "Chico da Roça", trend: "down" },
    {
      label: "Sentimento positivo",
      valor: `${r ? r.sentimento.positivo : 60}%`,
      trend: "up",
      delta: "+3 p.p.",
    },
  ];
  // Watchlist do /m (data/watchlist.json) — os 5 concorrentes nomeados com
  // símbolo, cor fixa e voto 2022, espelhando a fita do Cockpit do Candidato.
  const watchlistHtml = `<div class="card" style="margin-top:12px;">
    <div class="card-header"><div class="card-title">Watchlist do candidato — fita de concorrentes (/m)</div><span class="card-badge badge-real">cotações ao vivo no celular</span></div>
    <div class="conc-list">${watchlist.concorrentes_rj
      .map(
        (c) => `<div class="conc-row">
        <span class="conc-pos" style="color:${c.cor};font-family:var(--font-mono),monospace;">${c.simbolo}</span>
        <span class="conc-photo-wrap" style="display:flex;align-items:center;justify-content:center;background:${c.cor}22;border-color:${c.cor}66;color:${c.cor};font-weight:800;font-size:11px;">${c.simbolo.slice(0, 2)}</span>
        <span class="conc-name">${c.nome}<small>${c.partido}-RJ · ${c.interno ? "interno PL (coopetição na lista)" : "externo"}</small></span>
        <span class="conc-int">${c.votos2022 ? `${c.votos2022.toLocaleString("pt-BR")}<br/><small style="color:var(--texto-sec);font-size:9px;">votos 2022</small>` : "—"}</span>
      </div>`,
      )
      .join("")}</div>
  </div>`;
  return `<div id="sec-concorrentes" class="section active">
    ${regionBanner(region)}
    ${kpiRow(kpis)}
    <div class="grid-7-5" style="margin-top:12px;">
      <div class="card">
        <div class="card-header"><div class="card-title">Ranking — Vaga Federal RJ 2026</div><span class="card-badge badge-real">consolidado</span></div>
        ${rankingHtml}
      </div>
      ${chartCard("Disputa por Município", "nós × Chico", "cConcor", 240)}
    </div>
    ${watchlistHtml}
  </div>`;
}

const REGION_AWARE: Record<string, (region: RegionId) => string> = {
  dashboard,
  pesquisas,
  territorios,
  concorrentes,
};

/**
 * Retorna o HTML da seção, já no estado "active".
 * Usa o builder região-consciente quando disponível; senão, o HTML estático.
 */
export function buildSectionHtml(sectionId: string, region: RegionId): string {
  const builder = REGION_AWARE[sectionId];
  if (builder) return builder(region);

  const stat = campaignSections[sectionId as keyof typeof campaignSections];
  if (!stat) return "";
  // Mesmo nas seções ainda em HTML estático, exibe a região ativa no topo —
  // assim toda seção, sem exceção, reage ao seletor de região.
  const active = stat.replace('class="section"', 'class="section active"');
  return active.replace(
    /(<div[^>]*class="section active"[^>]*>)/,
    `$1${regionBanner(region)}`,
  );
}

/** Seções cobertas pelo builder região-consciente (para refiltrar ao trocar região). */
export const REGION_AWARE_SECTIONS = new Set(Object.keys(REGION_AWARE));
