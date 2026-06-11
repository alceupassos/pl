// Builders v2 do mock vivo — canais redes (ampliado), equipe, oportunidades,
// pesquisas, gastos e voz. Mesma filosofia do live-mock: tudo função pura do
// tempo, importando os mocks desktop (nunca duplicando dados) com variação
// determinística noise(seed,t) por cima.

import {
  getFinanceiroExecucao,
  getFinanceiroFontes,
  getExpectedVotesByRegion,
} from "@/lib/mock/campaign-metrics";
import { ORCAMENTO_TOTAL, RUBRICAS } from "@/lib/mock/gastos-rubricas";
import { MUNICAO } from "@/lib/mock/media";
import {
  getActivityFeed,
  getOrgAggregates,
  getOrganizers,
  getTierSummary,
  LEVEL_AVATAR,
} from "@/lib/mock/organizers";
import { getOpportunityRanking, getRegionTopOpportunity } from "@/lib/mock/priorities";
import { getDiscursoRecomendado, getRegionalNews } from "@/lib/mock/regional-news";
import {
  getDemographicCut,
  getRaceInstitutos,
  getRaceRanking,
  getRaceTimeline,
} from "@/lib/mock/races";
import { REGIONS } from "@/lib/mock/rj-regions";
import { SURVEY_CALENDAR, SURVEY_TEMPLATES, buildLiveResult } from "@/lib/mock/surveys";
import {
  HANDLES_REDES,
  NOMES_ELEITORES,
  VOZES_ELEITOR,
  VOZES_REDES,
} from "@/lib/mock/voter-voices";
import type { Series } from "@/lib/mock/types";
import { noise, seriesValue, snapshotRedes } from "@/lib/live-mock";
import type {
  ConcorrenteRede,
  EquipeDelta,
  EquipeFeedItem,
  EquipeSnapshot,
  GastosState,
  OportunidadesState,
  PesquisasDelta,
  PesquisasSnapshot,
  RedeId,
  RedesV2Delta,
  RedesV2Snapshot,
  SeriesLite,
  VozDelta,
  VozMsg,
  VozSnapshot,
} from "@/lib/live-schemas";
import type { Watchlist } from "@/lib/watchlist";

const MIN = 60_000;
const DAY = 86_400_000;

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return h >>> 0;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/* ── fotos por nome (assets reais em public/) ── */

const FOTO_POR_NOME: Record<string, string> = {
  "Sóstenes Cavalcante": "/sostenes1.png",
  "Renato Araújo": "/candidatos/renato_araujo_PL.png",
  "Laura Carneiro": "/candidatos/laura_carneiro_psd.png",
  "Marcelo Crivella": "/candidatos/marcelo_crivela_republicanos.png",
  "Dr. Luizinho": "/candidatos/dr_luizinho_psb.png",
  "Carlos Jordy": "/candidatos/carlos_jordy_PL.png",
  "Jorginho Brum": "/candidatos/jorginho_brum.png",
  "Áureo Ribeiro": "/candidatos/aureo_ribeiro_pl.png",
  "Chico Alencar": "/candidatos/chico_alencar_PSOL.png",
  "Célia Jordão": "/candidatos/celia_jordao_PL.png",
  Bebeto: "/candidatos/bebeto_PSC.png",
  "Chris Tonieto": "/candidatos/chris_tonieto_PL.png",
  "Delegado Furtado": "/candidatos/delegado_furtado_PL.png",
};

export function fotoPorNome(nome: string): string | null {
  return FOTO_POR_NOME[nome] ?? null;
}

function seriesToLite(s: Series): SeriesLite {
  return {
    labels: s.labels,
    series: s.datasets.map((d) => ({
      nome: d.label,
      cor: d.color,
      data: d.data.map((v) => (typeof v === "number" ? v : 0)),
    })),
  };
}

/* ══ redes v2 ══ */

const REDE_BASE: Record<RedeId, { seg: number; eng: number }> = {
  instagram: { seg: 412_000, eng: 4.1 },
  facebook: { seg: 351_000, eng: 2.6 },
  x: { seg: 268_000, eng: 3.4 },
  tiktok: { seg: 124_000, eng: 6.2 },
  youtube: { seg: 96_000, eng: 3.0 },
};

const REDE_IDS = Object.keys(REDE_BASE) as RedeId[];

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const HORAS_POST = [8, 10, 12, 14, 17, 19, 20, 21];

function segParams(rede: RedeId) {
  return { base: REDE_BASE[rede].seg, vol: 0.004, trend: 0.0019, seasonalWeight: 0.01 };
}

function concorrentesDaRede(w: Watchlist, rede: RedeId, now: number): ConcorrenteRede[] {
  const todos = [
    { simbolo: w.principal.simbolo, nome: w.principal.nome, cor: w.principal.cor, foto: w.principal.foto ?? null },
    ...w.concorrentes_rj.map((c) => ({ simbolo: c.simbolo, nome: c.nome, cor: c.cor, foto: c.foto ?? null })),
  ];
  return todos
    .map((c) => {
      const h = hash(`${c.simbolo}:${rede}`);
      const base = c.simbolo === w.principal.simbolo
        ? REDE_BASE[rede].seg
        : 40_000 + (h % 320_000);
      return {
        ...c,
        seguidores: Math.round(seriesValue(`cseg:${c.simbolo}:${rede}`, now, { base, vol: 0.006, trend: ((h % 9) - 3) / 2200, seasonalWeight: 0.01 })),
        engajamento: round1(2 + ((h >> 4) % 45) / 10 + noise(`ceng:${c.simbolo}:${rede}`, now, 2) * 0.8),
        crescimento7d: round1(noise(`ccr:${c.simbolo}:${rede}`, now, 2) * 6 + ((h % 7) - 2)),
      };
    })
    .sort((a, b) => b.seguidores - a.seguidores);
}

export function snapshotRedesV2(w: Watchlist, now: number): RedesV2Snapshot {
  const base = snapshotRedes(w, now);
  const today = Math.floor(now / DAY);

  const porRede = REDE_IDS.map((rede) => {
    const p = segParams(rede);
    const seguidores30d = Array.from({ length: 30 }, (_, i) => {
      const t = (today - 29 + i) * DAY + 12 * 3_600_000;
      return { t, v: Math.round(seriesValue(`segs:${rede}`, t, p)) };
    });
    const engajamento30d = Array.from({ length: 30 }, (_, i) => {
      const t = (today - 29 + i) * DAY + 12 * 3_600_000;
      return { t, v: round1(seriesValue(`engh:${rede}`, t, { base: REDE_BASE[rede].eng, vol: 0.16, spikeBoost: 0.6 })) };
    });
    const h = hash(`melhor:${rede}`);
    return {
      rede,
      seguidores30d,
      engajamento30d,
      seguidoresAgora: Math.round(seriesValue(`segs:${rede}`, now, p)),
      engajamentoAgora: round1(seriesValue(`engh:${rede}`, now, { base: REDE_BASE[rede].eng, vol: 0.16, spikeBoost: 0.6 })),
      concorrentes: concorrentesDaRede(w, rede, now),
      melhorHorario: { dia: DIAS[(h % 4) + 3], hora: HORAS_POST[(h >> 3) % HORAS_POST.length] },
    };
  });

  const veiculos = buildVeiculos(w, now);

  const heatmapPostagem: [number, number, number][] = [];
  for (let d = 0; d < 7; d += 1) {
    for (let hIdx = 0; hIdx < HORAS_POST.length; hIdx += 1) {
      const hora = HORAS_POST[hIdx];
      const noite = Math.exp(-((hora - 20) ** 2) / 8) * 55;
      const almoco = Math.exp(-((hora - 12) ** 2) / 5) * 30;
      const fimDeSemana = d === 0 || d === 6 ? 12 : 0;
      const ruido = ((hash(`hm:${d}:${hora}`) % 100) / 100) * 18;
      heatmapPostagem.push([d, hIdx, Math.min(100, Math.round(18 + noite + almoco + fimDeSemana + ruido))]);
    }
  }

  return { ...base, porRede, veiculos, heatmapPostagem };
}

function buildVeiculos(w: Watchlist, now: number) {
  const nomes = w.veiculos.length ? w.veiculos : ["O Globo", "Extra", "O Dia", "g1 Rio"];
  const raw = nomes.map((veiculo) => {
    const h = hash(`sov:${veiculo}`);
    return {
      veiculo,
      peso: 0.4 + ((h % 100) / 100) * (1 + 0.25 * noise(`sovn:${veiculo}`, now, 2)),
      tom: round1(Math.max(-1, Math.min(1, noise(`sovt:${veiculo}`, now, 2) * 0.8))),
      alcance: 300 + (h % 1900),
    };
  });
  const total = raw.reduce((s, r) => s + r.peso, 0);
  return raw
    .map((r) => ({
      veiculo: r.veiculo,
      share: round1((r.peso / total) * 100),
      tom: r.tom,
      alcance: r.alcance,
      spark: Array.from({ length: 12 }, (_, i) =>
        round1(50 + noise(`sovs:${r.veiculo}`, now - (11 - i) * 2 * 3_600_000, 2) * 30),
      ),
    }))
    .sort((a, b) => b.share - a.share);
}

export function deltaRedesV2(w: Watchlist, now: number): RedesV2Delta {
  const base = snapshotRedes(w, now);
  return {
    ...base,
    porRedeVivo: REDE_IDS.map((rede) => ({
      rede,
      seguidoresAgora: Math.round(seriesValue(`segs:${rede}`, now, segParams(rede))),
      engajamentoAgora: round1(seriesValue(`engh:${rede}`, now, { base: REDE_BASE[rede].eng, vol: 0.16, spikeBoost: 0.6 })),
      concorrentes: concorrentesDaRede(w, rede, now),
    })),
    veiculos: buildVeiculos(w, now),
  };
}

/* ══ equipe ══ */

function cadastrosHoje(now: number, seed: string, ratePerMin: number): number {
  const minutosDia = (now - Math.floor(now / DAY) * DAY) / MIN;
  return Math.floor(minutosDia * ratePerMin * (1 + 0.2 * noise(seed, Math.floor(now / DAY) * DAY)));
}

export function snapshotEquipe(now: number): EquipeSnapshot {
  const agg = getOrgAggregates("all");
  const cadHoje = cadastrosHoje(now, "cad:all", 2.6);
  const cadastrados = agg.metas.atual.cadastro + cadHoje;
  const velocidadeMin = round1(2.6 * (1 + 0.35 * noise("vel:all", now, 2)) + 0.4);

  const porRegiao = REGIONS.map((r) => {
    const a = getOrgAggregates(r.id);
    const extra = cadastrosHoje(now, `cad:${r.id}`, 0.34 * r.escala);
    const cad = a.metas.atual.cadastro + extra;
    const meta = a.metas.lista.cadastro;
    return {
      id: r.id,
      nome: r.apelido,
      cadastrados: cad,
      meta,
      pct: round1(Math.min(130, (cad / Math.max(1, meta)) * 100)),
      spark: Array.from({ length: 20 }, (_, i) =>
        Math.round(seriesValue(`cadsp:${r.id}`, now - (19 - i) * 30 * MIN, { base: 18 * r.escala, vol: 0.3, spikeBoost: 0.5 })),
      ),
    };
  });

  const tiers = [
    ...getTierSummary("all").map((t) => ({
      nivel: t.nivel,
      nome: t.nome,
      plural: t.plural,
      cor: t.cor,
      avatar: t.avatar,
      count: t.lideres,
      cadastroPct: t.cadastroPct,
      engajadoPct: t.engajadoPct,
      topPerformer: { nome: t.topPerformer, pct: 100 + (hash(`tp:${t.nivel}`) % 28) },
    })),
    {
      nivel: "cabo",
      nome: "Cabo eleitoral",
      plural: "Cabos eleitorais",
      cor: "#22c55e",
      avatar: LEVEL_AVATAR.cabo,
      count: agg.cabos,
      cadastroPct: round1(58 + noise("tier:cabo", now, 2) * 8),
      engajadoPct: round1(41 + noise("tier:cabo:e", now, 2) * 7),
      topPerformer: { nome: "Cabo Jeferson (Costa Verde)", pct: 118 },
    },
    {
      nivel: "eleitor",
      nome: "Eleitor",
      plural: "Eleitores na base",
      cor: "#60a5fa",
      avatar: LEVEL_AVATAR.eleitor,
      count: agg.eleitores + cadHoje,
      cadastroPct: round1((cadastrados / Math.max(1, agg.metas.lista.cadastro)) * 100),
      engajadoPct: round1((agg.metas.atual.engajado / Math.max(1, agg.metas.atual.cadastro)) * 100),
      topPerformer: { nome: "Comunidade Frade (Angra)", pct: 112 },
    },
  ];

  const ranking = getOrganizers("all")
    .map((o) => ({
      nome: o.nome,
      nivel: o.nivel,
      regiao: o.regiao,
      atingimentoPct: round1((o.atual.cadastro / Math.max(1, o.meta.cadastro)) * 100),
      cadastrados: o.atual.cadastro,
    }))
    .sort((a, b) => b.atingimentoPct - a.atingimentoPct)
    .slice(0, 10);

  return {
    geral: {
      lista: agg.metas.atual.lista + Math.floor(cadHoje * 1.6),
      cadastrados,
      engajados: agg.metas.atual.engajado + Math.floor(cadHoje * 0.45),
      meta: agg.metas.lista.cadastro,
      velocidadeMin,
    },
    porRegiao,
    tiers,
    funil: {
      lista: agg.metas.atual.lista + Math.floor(cadHoje * 1.6),
      cadastro: cadastrados,
      engajado: agg.metas.atual.engajado + Math.floor(cadHoje * 0.45),
    },
    ranking,
    feed: feedBase(now),
  };
}

function feedBase(now: number): EquipeFeedItem[] {
  return getActivityFeed("all").slice(0, 14).map((f, i) => ({
    id: `feed:${i}:${f.nome}`,
    t: now - f.minutosAtras * MIN,
    nome: f.nome,
    acao: f.acao,
    nivel: "líder",
    cor: f.cor,
  }));
}

const ACOES_VIVAS = [
  "cadastrou 3 eleitores pelo QR",
  "ativou um novo grupo de WhatsApp",
  "confirmou presença no evento de sábado",
  "bateu a meta semanal de cadastros",
  "respondeu a pesquisa interna",
  "indicou um novo cabo eleitoral",
];

export function deltaEquipe(now: number): EquipeDelta {
  const snap = snapshotEquipe(now);
  const slot = Math.floor(now / 7000);
  const feedNovos: EquipeFeedItem[] =
    hash(`fnv:${slot}`) % 10 < 4
      ? [
          {
            id: `live:${slot}`,
            t: now,
            nome: NOMES_ELEITORES[hash(`fn:${slot}`) % NOMES_ELEITORES.length],
            acao: ACOES_VIVAS[hash(`fa:${slot}`) % ACOES_VIVAS.length],
            nivel: "cabo",
            cor: "#22c55e",
          },
        ]
      : [];
  return {
    geral: snap.geral,
    porRegiao: snap.porRegiao.map((r) => ({
      id: r.id,
      cadastrados: r.cadastrados,
      pct: r.pct,
      sparkLast: r.spark[r.spark.length - 1],
    })),
    funil: snap.funil,
    feedNovos,
  };
}

/* ══ oportunidades ══ */

export function snapshotOportunidades(w: Watchlist, now: number): OportunidadesState {
  const dia = Math.floor(now / DAY);
  const regioes = REGIONS.map((r) => {
    const matrizFull = getOpportunityRanking(r.id);
    const matriz = matrizFull.slice(0, 6).map((m) => ({
      tema: m.tema,
      demanda: m.demanda,
      satisfacao: m.satisfacaoAtual,
      potencialVotos: m.potencialVotos,
      urgencia: m.urgencia,
      oportunidade: m.oportunidade,
    }));
    const forte = [...matrizFull].sort((a, b) => b.satisfacaoAtual - a.satisfacaoAtual)[0];
    const noticias = getRegionalNews(r.id).map((n) => ({
      titulo: n.titulo,
      veiculo: n.veiculo,
      tema: n.tema,
      link: n.link,
    }));
    const fraquezas = matriz.slice(0, 2).map((m, i) => {
      const adv = w.concorrentes_rj[hash(`fra:${r.id}:${dia}:${i}`) % w.concorrentes_rj.length];
      const noticia = noticias[i % Math.max(1, noticias.length)];
      return {
        adversario: { simbolo: adv.simbolo, nome: adv.nome, cor: adv.cor, foto: adv.foto ?? null },
        tema: m.tema,
        evidencia: noticia
          ? `${noticia.veiculo}: "${noticia.titulo}" — pauta sem resposta do adversário`
          : `Sem presença do adversário no tema na região`,
        severidade: Math.min(100, Math.round(m.urgencia + (hash(`sev:${r.id}:${i}`) % 18))),
      };
    });
    const discursos = getDiscursoRecomendado(r.id);
    return {
      id: r.id,
      nome: r.apelido,
      forca: { tema: forte.tema, score: forte.satisfacaoAtual },
      fraquezas,
      matriz,
      noticias,
      discurso: discursos[0] ?? { tema: matriz[0].tema, texto: "Assuma compromisso público com o tema líder da região." },
    };
  });

  return {
    regioes,
    topGeral: getRegionTopOpportunity().map((t) => ({ regiao: t.nome, tema: t.tema, indice: t.indice })),
    municao: MUNICAO.map((m) => ({
      titulo: m.titulo,
      veiculo: m.veiculo,
      alcance: m.alcance ?? 0,
      tema: "governo",
    })),
  };
}

/* ══ pesquisas ══ */

export function snapshotPesquisas(now: number): PesquisasSnapshot {
  const rankingRaw = getRaceRanking("dep-federal", "all").filter(
    (c) => c.nome !== "Indecisos" && c.nome !== "Outros / Brancos",
  );
  const ranking = rankingRaw.slice(0, 8).map((c) => ({
    nome: c.nome,
    partido: c.partido,
    cor: c.cor,
    foto: fotoPorNome(c.nome),
    intencao: c.intencao,
    rejeicao: c.rejeicao,
  }));

  const recortes = (["idade", "renda", "genero", "escolaridade"] as const).map((recorte) => ({
    recorte,
    ...seriesToLite(getDemographicCut("dep-federal", "all", recorte)),
  }));

  return {
    oficiais: {
      ranking,
      timeline: seriesToLite(getRaceTimeline("dep-federal", "all")),
      institutos: seriesToLite(getRaceInstitutos("dep-federal", "all")),
      recortes,
    },
    propria: buildPropria(now),
    calendario: SURVEY_CALENDAR.map((c) => ({
      semana: `${c.semana} · ${c.data}`,
      tema: c.tema,
      objetivo: c.objetivo,
    })),
  };
}

function buildPropria(now: number) {
  const dia = Math.floor(now / DAY);
  const template = SURVEY_TEMPLATES[dia % SURVEY_TEMPLATES.length];
  const minutosDia = (now - dia * DAY) / MIN;
  const frac = Math.min(1, minutosDia / (14 * 60)); // coleta "fecha" em ~14h de dia
  const tick = Math.floor(now / 5000);
  const live = buildLiveResult(template.id, 12_000, frac, tick);
  return {
    pergunta: template.pergunta,
    opcoes: template.opcoes.map((o) => ({ label: o.label, cor: o.cor })),
    live: {
      disparados: live.disparados,
      entregues: live.entregues,
      abertos: live.abertos,
      respondidos: live.respondidos,
      taxaResposta: live.taxaResposta,
      velocidade: live.velocidade,
      porOpcao: live.porOpcao,
      porRegiao: live.porRegiao,
      serieTempo: live.serieTempo,
      sentimento: live.sentimento,
    },
  };
}

export function deltaPesquisas(now: number): PesquisasDelta {
  return { propria: buildPropria(now) };
}

/* ══ gastos ══ */

export function snapshotGastos(now: number): GastosState {
  const exec = getFinanceiroExecucao();
  const num = (v: number | null) => (typeof v === "number" ? v : 0);
  const planejado = exec.datasets[0].data.map(num);
  const realizado = exec.datasets[1].data.map(num);
  const projecao = exec.datasets[2].data.map(num);

  const drift = 1 + 0.004 * noise("gasto:drift", now, 2);
  const gasto = Math.round(RUBRICAS.reduce((s, r) => s + r.gasto, 0) * drift);
  const total = ORCAMENTO_TOTAL;
  const fontesSeries = getFinanceiroFontes();
  const palette = fontesSeries.datasets[0].palette ?? [];

  const rubricas = RUBRICAS.map((r) => {
    const pct = Math.round((r.gasto / r.orcado) * 100);
    return {
      nome: r.nome,
      orcado: r.orcado,
      gasto: Math.round(r.gasto * drift),
      pct,
      status: pct > 100 ? ("estouro" as const) : pct > 85 ? ("atencao" as const) : ("ok" as const),
    };
  });

  const realizadoValidos = realizado.filter((v) => v > 0);
  const semanaAtual = realizadoValidos.length
    ? realizadoValidos[realizadoValidos.length - 1] - (realizadoValidos[realizadoValidos.length - 2] ?? 0)
    : 0;
  const mediaSemanal = Math.round(gasto / Math.max(1, realizadoValidos.length));
  const votosEsperados = getExpectedVotesByRegion().total;

  return {
    saldo: {
      total,
      gasto,
      disponivel: total - gasto,
      pctExecutado: round1((gasto / total) * 100),
    },
    execucao: { labels: exec.labels, planejado, realizado, projecao },
    fontes: fontesSeries.labels.map((nome, i) => ({
      nome,
      pct: num(fontesSeries.datasets[0].data[i]),
      valor: Math.round((total * num(fontesSeries.datasets[0].data[i])) / 100),
      cor: palette[i] ?? "#16C784",
    })),
    rubricas,
    burnRate: {
      semanaAtual,
      mediaSemanal,
      tendencia: semanaAtual > mediaSemanal * 1.1 ? "acelerando" : semanaAtual < mediaSemanal * 0.9 ? "desacelerando" : "estavel",
    },
    custoPorVoto: {
      atual: round1((gasto * 1000) / Math.max(1, votosEsperados)),
      projetado: round1((total * 1000) / Math.max(1, votosEsperados)),
      benchmark: 38,
    },
    alertas: rubricas
      .filter((r) => r.status !== "ok")
      .map((r) => ({
        rubrica: r.nome,
        msg:
          r.status === "estouro"
            ? `${r.nome} estourou o orçado (${r.pct}%) — corte ou suplementação`
            : `${r.nome} já consumiu ${r.pct}% do orçado`,
        nivel: r.status === "estouro" ? ("vermelho" as const) : ("amarelo" as const),
      })),
  };
}

/* ══ voz ══ */

const BAIRROS = REGIONS.flatMap((r) => r.bairrosDestaque.map((b) => ({ bairro: b.nome, regiao: r.apelido })));

function vozMsgAt(slot: number): VozMsg {
  const h = hash(`voz:${slot}`);
  const deEleitor = h % 100 < 58;
  const pool = deEleitor ? VOZES_ELEITOR : VOZES_REDES;
  const tpl = pool[h % pool.length];
  const local = BAIRROS[(h >> 6) % BAIRROS.length];
  return {
    id: `voz:${slot}`,
    t: slot * 2500,
    fonte: tpl.fonte,
    nome: deEleitor
      ? NOMES_ELEITORES[(h >> 3) % NOMES_ELEITORES.length]
      : HANDLES_REDES[(h >> 3) % HANDLES_REDES.length],
    bairro: deEleitor ? local.bairro : undefined,
    regiao: deEleitor ? local.regiao : undefined,
    texto: tpl.texto,
    sentimento: tpl.sentimento,
    curtidas: deEleitor ? undefined : 4 + (h % 220),
  };
}

function vozContadores(now: number) {
  const minutosDia = (now - Math.floor(now / DAY) * DAY) / MIN;
  const porMinuto = round1(1.6 + Math.abs(noise("voz:rate", now, 2)) * 2.2);
  const pos = round1(52 + noise("voz:pos", now, 2) * 9);
  const neg = round1(21 + noise("voz:neg", now, 2) * 7);
  return {
    totalHoje: Math.round(minutosDia * 1.9),
    porMinuto,
    sentimento: { pos, neg, neu: round1(100 - pos - neg) },
    porFonte: {
      eleitor: Math.round(minutosDia * 1.1),
      x: Math.round(minutosDia * 0.28),
      instagram: Math.round(minutosDia * 0.24),
      facebook: Math.round(minutosDia * 0.18),
      youtube: Math.round(minutosDia * 0.1),
    },
  };
}

export function snapshotVoz(now: number): VozSnapshot {
  const slot = Math.floor(now / 2500);
  const mensagens = Array.from({ length: 40 }, (_, i) => vozMsgAt(slot - i));
  return { mensagens, contadores: vozContadores(now) };
}

export function deltaVoz(now: number): VozDelta {
  const slot = Math.floor(now / 2500);
  return { mensagens: [vozMsgAt(slot)], contadores: vozContadores(now) };
}
