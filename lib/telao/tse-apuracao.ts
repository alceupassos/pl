// Apuração oficial TSE 2026 (resultados.tse.jus.br) para o telão de pleitos.
// O TSE publica JSONs estáticos "dados-simplificados" que são regravados a cada
// ~30s durante a apuração. Antes de 17h (horário de Brasília) os arquivos ainda
// não existem (NoSuchKey) → devolvemos status "aguardando".
//
// Códigos de eleição vêm de /oficial/comum/config/ele-c.json (pleito 3220):
//   6257 = Federal 1º turno (Presidente, abrangência BR)
//   6259 = Estadual 1º turno (Governador 3, Senador 5, Dep. Federal 6, Dep. Estadual 7)

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import snapshot from "./pleitos-sp.json";

export const TSE_BASE = "https://resultados.tse.jus.br/oficial/ele2026";

export type PleitoId =
  | "presidente"
  | "governador-sp"
  | "senador-sp"
  | "dep-federal-sp"
  | "dep-estadual-sp";

type PleitoCfg = { eleicao: string; uf: string; cargo: string };

export const PLEITO_CFG: Record<PleitoId, PleitoCfg> = {
  presidente: { eleicao: "6257", uf: "br", cargo: "0001" },
  "governador-sp": { eleicao: "6259", uf: "sp", cargo: "0003" },
  "senador-sp": { eleicao: "6259", uf: "sp", cargo: "0005" },
  "dep-federal-sp": { eleicao: "6259", uf: "sp", cargo: "0006" },
  "dep-estadual-sp": { eleicao: "6259", uf: "sp", cargo: "0007" },
};

export function isPleitoId(v: string): v is PleitoId {
  return v in PLEITO_CFG;
}

/* ── UFs ── */
import { REGIAO, UFS, UF_NOME, isUF } from "./ufs";
export { REGIAO, UFS, UF_NOME, isUF };

/** UF efetiva do pleito: presidente = Brasil (ou a UF quando há recorte municipal). */
export function ufDe(pleito: PleitoId, escopo: Escopo = {}): string {
  const uf = escopo.uf && isUF(escopo.uf) ? escopo.uf : "sp";
  if (pleito === "presidente") return escopo.mu || escopo.regional ? uf : "br";
  return uf;
}

/** Código do cargo; no DF a assembleia é a Câmara Legislativa (dep. distrital, 0008). */
function cargoDe(pleito: PleitoId, uf: string): string {
  if (pleito === "dep-estadual-sp" && uf === "df") return "0008";
  return PLEITO_CFG[pleito].cargo;
}

export type CandApurado = {
  sq: string; // sequencial TSE (também é o nome da foto)
  num: string;
  nome: string;
  partido: string;
  agremiacao: string; // federação/coligação (ou o próprio partido)
  votos: number;
  pct: number; // % dos votos válidos
  eleito: boolean;
  situacao: string; // "Eleito", "Eleito por QP", "Eleito por média", "2º turno", "Suplente", "Não eleito", ""
};

/** Partido/federação no relatório completo (proporcionais: bancadas). */
export type PartidoApurado = {
  sigla: string; // agremiação (federação conta como uma)
  partidos: string[];
  nominais: number;
  legenda: number;
  total: number;
  pct: number; // % dos válidos
  vagas: number; // oficial (TSE) quando já distribuídas, senão estimativa
  vagasOficial: boolean;
  faltaMais1?: number; // ≈ votos que faltam para a próxima cadeira (estimativa)
};

/**
 * Necessidade de votos (proporcionais), recalculada a cada totalização.
 * - QE = válidos ÷ vagas: votos que o partido/federação precisa por cadeira.
 * - Mínimo individual: 10% do QE (cadeiras por QP) e 20% (sobras) — Lei 14.211/21.
 * - Partido precisa de 80% do QE para disputar as sobras.
 * - "Projetado" = escalado para 100% das urnas (ou, antes da apuração, estimado
 *   pelo eleitorado × comparecimento × válidos históricos).
 */
export type Necessidade = {
  base: "apuracao" | "estimativa" | "oficial";
  eleitorado: number;
  validosProjetados: number;
  qe: number; // atual (parcial)
  qeProjetado: number;
  minIndividual: number; // 10% do QE projetado
  minSobras: number; // 20% do QE projetado
  minPartidoSobras: number; // 80% do QE projetado
  corte: number; // votos do último eleito projetado (parcial)
  corteProjetado: number;
  ultimoEleito?: { nome: string; partido: string; votos: number };
  primeiroFora?: { nome: string; partido: string; votos: number };
};

// Parâmetros da estimativa pré-apuração (proporcionais, referência 2022):
// comparecimento ≈ 79,5% do eleitorado; válidos ≈ 87,5% dos votos totais.
const COMPARECIMENTO_EST = 0.795;
const VALIDOS_EST = 0.875;

export type Apuracao = {
  pleito: PleitoId;
  escopo: Escopo;
  status: "aguardando" | "apurando" | "finalizado" | "erro";
  pctUrnas: number; // % seções totalizadas
  secoesTot: number;
  secoesTotal: number;
  eleitorado: number;
  comparecimento: number;
  pctComparecimento: number;
  abstencao: number;
  pctAbstencao: number;
  votosTotais: number;
  votosValidos: number;
  pctValidos: number; // % dos votos totais
  nominais: number;
  legenda: number;
  brancos: number;
  pctBrancos: number;
  nulos: number;
  pctNulos: number;
  subJudice: number; // anulados sub judice
  vagas: number; // cadeiras em disputa (nv)
  quocienteEleitoral: number; // proporcionais (oficial, ou válidos ÷ vagas)
  totalizado: boolean; // totalização final (tf)
  hora: string; // "dd/mm hh:mm:ss" da última totalização
  fotoBase: string; // prefixo do proxy de foto: /api/telao/foto/<eleicao>/<uf>
  cand: CandApurado[];
  partidosIndividuais?: { sigla: string; nominais: number; legenda: number; total: number; pct: number }[];
  partidos: PartidoApurado[];
  historico: PontoHist[]; // evolução: um ponto por totalização observada
  uf: string; // UF dos dados (br = Brasil)
  necessidade?: Necessidade; // só proporcionais
};

/** % dos válidos de cada candidato (top 15, por sq) num instante da apuração. */
export type PontoHist = { urnas: number; hora: string; c: Record<string, number> };

// "12,34" → 12.34 ; "1.234" (não ocorre no TSE, mas tolera) → 1234
function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string" || !v) return 0;
  return Number(v.replace(/\./g, "").replace(",", ".")) || 0;
}

type RawCand = Record<string, unknown>;
type RawPar = { sg?: string; tvtn?: string; tvtl?: string; cand?: RawCand[] };
type RawAgr = { nm?: string; com?: string; tp?: string; vag?: string; par?: RawPar[] };
type Raw = Record<string, unknown> & {
  s?: Record<string, unknown>;
  v?: Record<string, unknown>;
  e?: Record<string, unknown>;
  cand?: RawCand[];
  carg?: { nv?: string; qe?: string; agr?: RawAgr[] }[];
};

export type Escopo = { mu?: string; zona?: string; uf?: string; regional?: boolean };

// Dois formatos do TSE: "dados-simplificados" (cand plano, partido em cc) e o
// relatório completo "dados/…-u.json" (carg → agr → par → cand).
function rawCands(raw: Raw): (RawCand & { _sg?: string; _agr?: string })[] {
  if (Array.isArray(raw.cand)) return raw.cand;
  const out: (RawCand & { _sg?: string; _agr?: string })[] = [];
  for (const cg of raw.carg ?? [])
    for (const ag of cg.agr ?? [])
      for (const par of ag.par ?? [])
        for (const c of par.cand ?? []) out.push({ ...c, _sg: par.sg, _agr: ag.com || par.sg });
  return out;
}

/**
 * Estimativa de cadeiras (proporcionais), regra vigente simplificada:
 * 1) QP: agremiação recebe ⌊votos ÷ QE⌋;
 * 2) sobras pelas maiores médias (D'Hondt) entre quem atingiu 80% do QE;
 * 3) se ainda sobrar, maiores médias entre todas (STF, ADIs 7228/7263/7325).
 */
function estimarVagas(partidos: PartidoApurado[], vagas: number, qe: number): number {
  if (!vagas || !qe) return 0;
  const qp = new Map(partidos.map((p) => [p.sigla, Math.floor(p.total / qe)]));
  let livres = vagas - [...qp.values()].reduce((a, b) => a + b, 0);
  let menorMedia = 0; // menor média que ainda levou cadeira (corte das sobras)
  const media = (aptos: PartidoApurado[]) => {
    while (livres > 0 && aptos.length) {
      let best = aptos[0];
      let bestM = -1;
      for (const p of aptos) {
        const m = p.total / ((qp.get(p.sigla) ?? 0) + 1);
        if (m > bestM) {
          bestM = m;
          best = p;
        }
      }
      qp.set(best.sigla, (qp.get(best.sigla) ?? 0) + 1);
      menorMedia = menorMedia ? Math.min(menorMedia, bestM) : bestM;
      livres--;
    }
  };
  media(partidos.filter((p) => p.total >= 0.8 * qe));
  media(partidos.filter((p) => p.total > 0));
  for (const p of partidos) p.vagas = qp.get(p.sigla) ?? 0;
  return menorMedia;
}

/** ≈ votos que cada agremiação precisa somar para ganhar mais uma cadeira. */
function faltasMais1(partidos: PartidoApurado[], qe: number, menorMedia: number): void {
  if (!qe) return;
  for (const p of partidos) {
    const porMedia = menorMedia ? (p.vagas + 1) * menorMedia - p.total : (p.vagas + 1) * qe - p.total;
    const porClausula = p.total < 0.8 * qe ? 0.8 * qe - p.total : 0;
    p.faltaMais1 = Math.max(1, Math.ceil(Math.max(porMedia, porClausula)));
  }
}

function calcNecessidade(a: Apuracao): Necessidade {
  const u = a.pctUrnas;
  const apurando = a.votosValidos > 0 && u > 0;
  const fator = apurando ? 100 / u : 1;
  const validosProjetados = apurando
    ? Math.round(a.votosValidos * fator)
    : Math.round(a.eleitorado * COMPARECIMENTO_EST * VALIDOS_EST);
  const oficial = a.totalizado && a.quocienteEleitoral > 0;
  const qeProjetado = oficial ? a.quocienteEleitoral : a.vagas ? Math.round(validosProjetados / a.vagas) : 0;
  const qe = a.quocienteEleitoral;

  // eleitos: oficiais (TSE) ou projetados = mais votados de cada agremiação
  // dentro das cadeiras estimadas, respeitando os 10% do QE individuais
  let eleitos = a.cand.filter((c) => c.eleito);
  if (!eleitos.length && apurando) {
    if (a.partidos.some((p) => p.vagas > 0)) {
      for (const p of a.partidos) {
        if (!p.vagas) continue;
        eleitos.push(...a.cand.filter((c) => c.agremiacao === p.sigla && c.votos >= 0.1 * qe).slice(0, p.vagas));
      }
    } else eleitos = a.cand.slice(0, a.vagas);
  }
  const sqEleitos = new Set(eleitos.map((c) => c.sq));
  const ult = eleitos.reduce<CandApurado | undefined>((m, c) => (!m || c.votos < m.votos ? c : m), undefined);
  const fora = apurando ? a.cand.find((c) => !sqEleitos.has(c.sq) && c.votos > 0) : undefined;
  const resumo = (c?: CandApurado) => (c ? { nome: c.nome, partido: c.partido, votos: c.votos } : undefined);
  return {
    base: oficial ? "oficial" : apurando ? "apuracao" : "estimativa",
    eleitorado: a.eleitorado,
    validosProjetados,
    qe,
    qeProjetado,
    minIndividual: Math.ceil(qeProjetado * 0.1),
    minSobras: Math.ceil(qeProjetado * 0.2),
    minPartidoSobras: Math.ceil(qeProjetado * 0.8),
    corte: ult?.votos ?? 0,
    corteProjetado: ult ? Math.round(ult.votos * (a.totalizado ? 1 : fator)) : 0,
    ultimoEleito: resumo(ult),
    primeiroFora: resumo(fora),
  };
}

function normalize(pleito: PleitoId, raw: Raw, escopo: Escopo): Apuracao {
  const s = raw.s ?? {};
  const v = raw.v ?? {};
  const e = raw.e ?? {};
  const carg = raw.carg?.[0];
  const pct = num(s.pst);
  const vv = num(v.vv);
  const vagas = num(carg?.nv) || (pleito === "senador-sp" ? 2 : 1);
  const uf = ufDe(pleito, escopo);
  const cand = rawCands(raw)
    .map((c) => ({
      sq: String(c.sqcand ?? ""),
      num: String(c.n ?? ""),
      nome: String(c.nmu ?? c.nm ?? ""),
      partido: c._sg ? String(c._sg) : String(c.cc ?? "").split(" - ")[0],
      agremiacao: c._agr ? String(c._agr) : String(c.cc ?? "").split(" - ")[0],
      votos: num(c.vap),
      // sempre % dos votos válidos: o TSE já publica pvap sobre válidos; se faltar,
      // calcula votos/válidos (no Senado com 2 vagas o TSE divide pelo total de
      // votos válidos de cada vaga — por isso pvap tem prioridade).
      pct: c.pvap !== undefined && c.pvap !== "" ? num(c.pvap) : vv > 0 ? (num(c.vap) / vv) * 100 : 0,
      eleito: c.e === "s" || c.e === "S",
      situacao: String(c.st ?? ""),
    }))
    .sort((a, b) => b.votos - a.votos);

  // bancadas por agremiação (só no relatório completo)
  const partidos: PartidoApurado[] = (carg?.agr ?? [])
    .map((ag) => {
      const pars = ag.par ?? [];
      const nominais = pars.reduce((t, p) => t + num(p.tvtn), 0);
      const legenda = pars.reduce((t, p) => t + num(p.tvtl), 0);
      const total = nominais + legenda;
      return {
        sigla: ag.com || pars[0]?.sg || String(ag.nm ?? ""),
        partidos: pars.map((p) => String(p.sg ?? "")),
        nominais,
        legenda,
        total,
        pct: vv > 0 ? (total / vv) * 100 : 0,
        vagas: num(ag.vag),
        vagasOficial: num(ag.vag) > 0,
      };
    })
    .sort((a, b) => b.total - a.total);
  const qeOficial = num(carg?.qe);
  const qe = qeOficial || (vagas > 2 && vv > 0 ? Math.round(vv / vagas) : 0);
  let menorMedia = 0;
  if (vagas > 2 && partidos.length && !partidos.some((p) => p.vagasOficial))
    menorMedia = estimarVagas(partidos, vagas, qe);
  if (vagas > 2) faltasMais1(partidos, qe, menorMedia);

  const tv = num(v.tv);
  const out: Apuracao = {
    pleito,
    escopo,
    // O TSE pré-publica arquivos zerados antes das 17h → ainda "aguardando".
    status: pct >= 100 || raw.tf === "s" ? "finalizado" : pct > 0 || vv > 0 ? "apurando" : "aguardando",
    pctUrnas: pct,
    secoesTot: num(s.st),
    secoesTotal: num(s.ts),
    eleitorado: num(e.te),
    comparecimento: num(e.c),
    pctComparecimento: num(e.pc),
    abstencao: num(e.a),
    pctAbstencao: num(e.pa),
    votosTotais: tv,
    votosValidos: vv,
    pctValidos: tv > 0 ? (vv / tv) * 100 : num(v.pvv),
    nominais: num(v.vnom),
    legenda: num(v.vl),
    brancos: num(v.vb),
    pctBrancos: num(v.pvb),
    nulos: num(v.tvn ?? v.vn),
    pctNulos: num(v.ptvn ?? v.pvn),
    subJudice: num(v.vansj),
    vagas,
    quocienteEleitoral: vagas > 2 ? qe : 0,
    totalizado: raw.tf === "s",
    // dt/ht = horário da totalização; dg/hg = geração do arquivo
    hora: [raw.dt || raw.dg, raw.ht || raw.hg].filter(Boolean).join(" "),
    fotoBase: fotoBaseDe(pleito, escopo),
    cand,
    partidosIndividuais: (carg?.agr ?? []).flatMap(ag => (ag.par ?? []).map(p => { const nominais = num(p.tvtn), legenda = num(p.tvtl), total = nominais + legenda; return { sigla: String(p.sg ?? ""), nominais, legenda, total, pct: vv > 0 ? 100 * total / vv : 0 }; })),
    partidos,
    historico: [],
    uf,
  };
  if (vagas > 2) out.necessidade = calcNecessidade(out);
  return out;
}

// As fotos ficam no diretório da UF da candidatura (presidente = br).
export function fotoBaseDe(pleito: PleitoId, escopo: Escopo = {}): string {
  const { eleicao } = PLEITO_CFG[pleito];
  const uf = pleito === "presidente" ? "br" : ufDe(pleito, escopo);
  return `/api/telao/foto/${eleicao}/${uf}`;
}

function vazio(pleito: PleitoId, status: Apuracao["status"], escopo: Escopo): Apuracao {
  return {
    uf: ufDe(pleito, escopo),
    pleito,
    escopo,
    status,
    pctUrnas: 0,
    secoesTot: 0,
    secoesTotal: 0,
    eleitorado: 0,
    comparecimento: 0,
    pctComparecimento: 0,
    abstencao: 0,
    pctAbstencao: 0,
    votosTotais: 0,
    votosValidos: 0,
    pctValidos: 0,
    nominais: 0,
    legenda: 0,
    brancos: 0,
    pctBrancos: 0,
    nulos: 0,
    pctNulos: 0,
    subJudice: 0,
    vagas: 0,
    quocienteEleitoral: 0,
    totalizado: false,
    hora: "",
    fotoBase: fotoBaseDe(pleito, escopo),
    cand: [],
    partidos: [],
    historico: [],
  };
}

// Cache em memória de 5 min por pleito+escopo (cadência pedida para o telão;
// o TSE regrava a cada ~30s, mas não precisamos martelar o CDN deles).
const TTL = 5 * 60_000;
const cache = new Map<string, { at: number; data: Apuracao }>();
const inflight = new Map<string, Promise<Apuracao>>();

// Município/zona pertencem à UF do telão (escopo.uf, padrão SP). Para presidente,
// o recorte municipal usa o diretório da UF na eleição federal.
export const UF_FILTRO = "sp";

// Relatório completo (dados/…-u.json) é a fonte principal: traz eleitorado,
// comparecimento, legenda, bancadas, QE e situação (QP/média). O simplificado
// (dados-simplificados/…-r.json) fica como reserva para estado/Brasil.
function urlsDe(pleito: PleitoId, escopo: Escopo): string[] {
  const { eleicao } = PLEITO_CFG[pleito];
  const uf = ufDe(pleito, escopo);
  const sufixo = `c${cargoDe(pleito, uf)}-e00${eleicao}`;
  if (!escopo.mu)
    return [
      `${TSE_BASE}/${eleicao}/dados/${uf}/${uf}-${sufixo}-u.json`,
      `${TSE_BASE}/${eleicao}/dados-simplificados/${uf}/${uf}-${sufixo}-r.json`,
    ];
  const z = escopo.zona ? `-z${escopo.zona}` : "";
  return [`${TSE_BASE}/${eleicao}/dados/${uf}/${uf}${escopo.mu}${z}-${sufixo}-u.json`];
}

async function fetchUm(url: string, pleito: PleitoId, escopo: Escopo): Promise<Apuracao> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return vazio(pleito, res.status === 404 || res.status === 403 ? "aguardando" : "erro", escopo);
    const text = await res.text();
    if (!text.trimStart().startsWith("{") || text.includes('"NoSuchKey"')) return vazio(pleito, "aguardando", escopo);
    return normalize(pleito, JSON.parse(text) as Raw, escopo);
  } catch {
    return vazio(pleito, "erro", escopo);
  }
}

async function fetchPleito(pleito: PleitoId, escopo: Escopo): Promise<Apuracao> {
  const [principal, ...reservas] = urlsDe(pleito, escopo);
  const a = await fetchUm(principal, pleito, escopo);
  if (a.status !== "erro" && (a.status !== "aguardando" || reservas.length === 0)) return a;
  for (const u of reservas) {
    const b = await fetchUm(u, pleito, escopo);
    if (b.status === "apurando" || b.status === "finalizado") return b;
  }
  return a;
}

export async function getApuracao(pleito: PleitoId, escopo: Escopo = {}): Promise<Apuracao> {
  // SP mantém a chave antiga (histórico já gravado em data/apuracao-historico.json)
  const uf = ufDe(pleito, escopo);
  const ufKey = uf === "sp" || uf === "br" ? "" : `|${uf}`;
  const key = `${pleito}|${escopo.mu ?? ""}|${escopo.zona ?? ""}${ufKey}${escopo.regional ? "|regional" : ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  let p = inflight.get(key);
  if (!p) {
    p = fetchPleito(pleito, escopo).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  const data = await p;
  // Em erro transitório, mantém o último resultado bom.
  if (data.status === "erro" && hit) return hit.data;
  if (data.status !== "erro") data.historico = await registrarHistorico(key, data);
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 800) cache.delete(cache.keys().next().value!);
  return data;
}

/* ── histórico da apuração (gráfico de evolução) ──
   Cada nova totalização (% de urnas diferente) vira um ponto. Persistido em
   data/apuracao-historico.json para sobreviver a restart do PM2. */
const HIST_FILE = path.join(process.cwd(), "data", "apuracao-historico.json");
let hist: Record<string, PontoHist[]> | null = null;

async function loadHist(): Promise<Record<string, PontoHist[]>> {
  if (hist) return hist;
  try {
    hist = JSON.parse(await readFile(HIST_FILE, "utf8")) as Record<string, PontoHist[]>;
  } catch {
    hist = {};
  }
  return hist;
}

async function registrarHistorico(key: string, a: Apuracao): Promise<PontoHist[]> {
  const h = await loadHist();
  const serie = h[key] ?? [];
  if (a.status === "aguardando" || a.cand.length === 0) return serie;
  const ultimo = serie[serie.length - 1];
  if (!ultimo || ultimo.urnas !== a.pctUrnas) {
    const c: Record<string, number> = {};
    for (const cand of a.cand.slice(0, 15)) c[cand.sq] = cand.pct;
    serie.push({ urnas: a.pctUrnas, hora: a.hora, c });
    h[key] = serie.slice(-200);
    mkdir(path.dirname(HIST_FILE), { recursive: true })
      .then(() => writeFile(HIST_FILE, JSON.stringify(h), "utf8"))
      .catch(() => {});
  }
  return h[key] ?? serie;
}

/* ── municípios e zonas por UF (config oficial do TSE) ── */

export type Municipio = { cd: string; nm: string; z: string[] };
let munCache: { at: number; data: Record<string, Municipio[]> } | null = null;

export async function getMunicipios(uf = UF_FILTRO): Promise<Municipio[]> {
  if (munCache && Date.now() - munCache.at < 6 * 3.6e6) return munCache.data[uf] ?? [];
  try {
    const res = await fetch(`${TSE_BASE}/6259/config/mun-e006259-cm.json`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as { abr: { cd: string; mu: Municipio[] }[] };
    const data: Record<string, Municipio[]> = {};
    for (const a of json.abr)
      data[a.cd.toLowerCase()] = (a.mu ?? [])
        .map((m) => ({ cd: m.cd, nm: m.nm, z: m.z ?? [] }))
        .sort((x, y) => x.nm.localeCompare(y.nm, "pt-BR"));
    if (Object.keys(data).length) munCache = { at: Date.now(), data };
    return data[uf] ?? [];
  } catch {
    return munCache?.data[uf] ?? [];
  }
}

export function getMunicipiosSP(): Promise<Municipio[]> {
  return getMunicipios(UF_FILTRO);
}

/* ── snapshot pré-apuração (eleicoes.dev / DivulgaCandContas) ── */

export type CandSnapshot = {
  n: string;
  nome: string;
  num: number;
  p: string;
  st: string;
  bens: number;
  foto: string;
  col: string | null;
  occ: string;
  nat: string;
  g: "F" | "M";
};

export type PleitoSnapshot = {
  id: PleitoId;
  titulo: string;
  uf: string;
  vagas: number;
  total: number;
  statusFonte?: Apuracao["status"];
  candidatos: CandSnapshot[];
};

export const PLEITOS = snapshot.pleitos as PleitoSnapshot[];
export const SNAPSHOT_META = { atualizado: snapshot.atualizado, fonte: snapshot.fonte };

// sequencial TSE a partir da URL de foto do DivulgaCandContas (…/img/<eleicao>/<sq>/<uf>)
export function sqFromFotoUrl(url: string): string {
  const m = url.match(/\/(\d{9,})\/[A-Z]{2}$/);
  return m ? m[1] : "";
}

/**
 * Snapshot pré-apuração de outra UF, montado a partir dos JSONs que o TSE
 * pré-publica zerados (nome de urna, número, partido, sequencial). SP usa o
 * snapshot rico (eleicoes.dev, com bens/ocupação).
 */
const TITULO: Record<PleitoId, string> = {
  presidente: "PRESIDENTE",
  "governador-sp": "GOVERNADOR",
  "senador-sp": "SENADOR",
  "dep-federal-sp": "DEPUTADO FEDERAL",
  "dep-estadual-sp": "DEPUTADO ESTADUAL",
};

export async function getSnapshotUF(uf: string): Promise<PleitoSnapshot[]> {
  if (uf === "sp" || !isUF(uf)) return PLEITOS;
  const ids = Object.keys(PLEITO_CFG) as PleitoId[];
  const aps = await Promise.all(ids.map((id) => getApuracao(id, { uf })));
  return ids.map((id, i) => {
    const base = PLEITOS.find((p) => p.id === id);
    if (id === "presidente" && base) return base;
    const a = aps[i];
    const UF = uf.toUpperCase();
    const titulo = id === "dep-estadual-sp" && uf === "df" ? "DEPUTADO DISTRITAL" : TITULO[id];
    return {
      id,
      titulo: `${titulo} · ${UF}`,
      uf: UF,
      vagas: a.vagas || (id === "senador-sp" ? 2 : 1),
      total: a.cand.length,
      statusFonte: a.status,
      candidatos: a.cand.map((c) => ({
        n: c.nome,
        nome: c.nome,
        num: Number(c.num),
        p: c.partido,
        st: c.situacao,
        bens: 0,
        foto: `/api/telao/foto/${PLEITO_CFG[id].eleicao}/${uf}/${c.sq}`,
        col: c.agremiacao === c.partido ? null : c.agremiacao,
        occ: "",
        nat: "",
        g: "M" as const,
      })),
    };
  });
}
