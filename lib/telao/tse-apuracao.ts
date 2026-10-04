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
};

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
  partidos: PartidoApurado[];
  historico: PontoHist[]; // evolução: um ponto por totalização observada
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

export type Escopo = { mu?: string; zona?: string };

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
function estimarVagas(partidos: PartidoApurado[], vagas: number, qe: number): void {
  if (!vagas || !qe) return;
  const qp = new Map(partidos.map((p) => [p.sigla, Math.floor(p.total / qe)]));
  let livres = vagas - [...qp.values()].reduce((a, b) => a + b, 0);
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
      livres--;
    }
  };
  media(partidos.filter((p) => p.total >= 0.8 * qe));
  media(partidos.filter((p) => p.total > 0));
  for (const p of partidos) p.vagas = qp.get(p.sigla) ?? 0;
}

function normalize(pleito: PleitoId, raw: Raw, escopo: Escopo): Apuracao {
  const s = raw.s ?? {};
  const v = raw.v ?? {};
  const e = raw.e ?? {};
  const carg = raw.carg?.[0];
  const pct = num(s.pst);
  const vv = num(v.vv);
  const vagas = num(carg?.nv) || (pleito === "senador-sp" ? 2 : 1);
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
  if (vagas > 2 && partidos.length && !partidos.some((p) => p.vagasOficial)) estimarVagas(partidos, vagas, qe);

  const tv = num(v.tv);
  return {
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
    fotoBase: fotoBaseDe(pleito),
    cand,
    partidos,
    historico: [],
  };
}

// As fotos ficam no diretório da UF da candidatura (presidente = br).
function fotoBaseDe(pleito: PleitoId): string {
  const { eleicao, uf } = PLEITO_CFG[pleito];
  return `/api/telao/foto/${eleicao}/${uf}`;
}

function vazio(pleito: PleitoId, status: Apuracao["status"], escopo: Escopo): Apuracao {
  return {
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
    fotoBase: fotoBaseDe(pleito),
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

// Município/zona são sempre de SP (a UF do telão). Para presidente, o recorte
// municipal usa o diretório sp da eleição federal.
export const UF_FILTRO = "sp";

// Relatório completo (dados/…-u.json) é a fonte principal: traz eleitorado,
// comparecimento, legenda, bancadas, QE e situação (QP/média). O simplificado
// (dados-simplificados/…-r.json) fica como reserva para estado/Brasil.
function urlsDe(pleito: PleitoId, escopo: Escopo): string[] {
  const { eleicao, uf, cargo } = PLEITO_CFG[pleito];
  const sufixo = `c${cargo}-e00${eleicao}`;
  if (!escopo.mu)
    return [
      `${TSE_BASE}/${eleicao}/dados/${uf}/${uf}-${sufixo}-u.json`,
      `${TSE_BASE}/${eleicao}/dados-simplificados/${uf}/${uf}-${sufixo}-r.json`,
    ];
  const z = escopo.zona ? `-z${escopo.zona}` : "";
  return [`${TSE_BASE}/${eleicao}/dados/${UF_FILTRO}/${UF_FILTRO}${escopo.mu}${z}-${sufixo}-u.json`];
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
  const key = `${pleito}|${escopo.mu ?? ""}|${escopo.zona ?? ""}`;
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
  if (cache.size > 400) cache.delete(cache.keys().next().value!);
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

/* ── municípios e zonas de SP (config oficial do TSE) ── */

export type Municipio = { cd: string; nm: string; z: string[] };
let munCache: { at: number; data: Municipio[] } | null = null;

export async function getMunicipiosSP(): Promise<Municipio[]> {
  if (munCache && Date.now() - munCache.at < 6 * 3.6e6) return munCache.data;
  try {
    const res = await fetch(`${TSE_BASE}/6259/config/mun-e006259-cm.json`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as { abr: { cd: string; mu: Municipio[] }[] };
    const sp = json.abr.find((a) => a.cd === UF_FILTRO);
    const data = (sp?.mu ?? [])
      .map((m) => ({ cd: m.cd, nm: m.nm, z: m.z ?? [] }))
      .sort((a, b) => a.nm.localeCompare(b.nm, "pt-BR"));
    if (data.length) munCache = { at: Date.now(), data };
    return data;
  } catch {
    return munCache?.data ?? [];
  }
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
  candidatos: CandSnapshot[];
};

export const PLEITOS = snapshot.pleitos as PleitoSnapshot[];
export const SNAPSHOT_META = { atualizado: snapshot.atualizado, fonte: snapshot.fonte };

// sequencial TSE a partir da URL de foto do DivulgaCandContas (…/img/<eleicao>/<sq>/<uf>)
export function sqFromFotoUrl(url: string): string {
  const m = url.match(/\/(\d{9,})\/[A-Z]{2}$/);
  return m ? m[1] : "";
}
