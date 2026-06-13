// Histórico de votações Câmara — arquivos bulk anuais (comissões + plenário + votos nominais).
// https://dadosabertos.camara.leg.br/swagger/api.html — seção "Votações" / "Voto de cada parlamentar"

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { DeputadoVoto } from "@/lib/live-schemas";

const BULK_BASE = "https://dadosabertos.camara.leg.br/arquivos";
const BULK_TTL_MS = 24 * 60 * 60 * 1000;
const BULK_TIMEOUT_MS = 120_000;
const DEPUTADO_ID = "178947";
const HISTORICO_MAX = 48;
const VOTOS_DEPUTADO_MAX = 24;
const NOMINAL_VOTACOES_MAX = 4;

const ORGAOS_FIXOS: { id: number; sigla: string; nome: string }[] = [
  { id: 180, sigla: "PLEN", nome: "Plenário" },
  { id: 2003, sigla: "CCJC", nome: "Constituição e Justiça" },
  { id: 5503, sigla: "CSPCCO", nome: "Segurança Pública" },
  { id: 5376, sigla: "CPD", nome: "Previdência e Assistência Social" },
  { id: 5370, sigla: "CCOM", nome: "Comunicação" },
];

const CACHE_FILE = join(process.cwd(), "data", "plenario-historico-cache.json");

export type VotacaoHistoricoItem = {
  id: string;
  titulo: string;
  data: string;
  orgao: string;
  sim: number;
  nao: number;
  outros: number;
  aprovacao: boolean;
  votoSostenes: string | null;
  temNominal: boolean;
};

export type VotoDeputadoItem = {
  idVotacao: string;
  data: string;
  voto: string;
  titulo: string;
  orgao: string;
};

export type PlenarioHistoricoBulk = {
  ano: number;
  orgaosMonitorados: { sigla: string; nome: string }[];
  historico: VotacaoHistoricoItem[];
  votosDeputado: VotoDeputadoItem[];
  /** Votos nominais por id de votação (últimas votações PLEN com dado). */
  nominais: Record<string, DeputadoVoto[]>;
};

type VotacaoBulk = {
  id: string;
  data?: string;
  dataHoraRegistro?: string;
  idOrgao?: number;
  siglaOrgao?: string;
  descricao?: string;
  aprovacao?: number;
  votosSim?: number;
  votosNao?: number;
  votosOutros?: number;
};

type VotoBulk = {
  idVotacao: string;
  dataHoraVoto?: string;
  voto?: string;
  deputado_?: {
    id?: string;
    nome?: string;
    siglaPartido?: string;
    siglaUf?: string;
    urlFoto?: string;
  };
};

let cache: { at: number; value: PlenarioHistoricoBulk | null } = { at: 0, value: null };
let inFlight = false;

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && Array.isArray(raw.historico)) {
      cache = { at: 0, value: raw as PlenarioHistoricoBulk };
    }
  } catch {
    /* primeira execução */
  }
})();

export function getPlenarioHistoricoBulk(): PlenarioHistoricoBulk | null {
  return cache.value;
}

export function ensureFreshPlenarioHistorico(): void {
  if (inFlight) return;
  const ano = new Date().getFullYear();
  if (cache.value?.ano === ano && Date.now() - cache.at < BULK_TTL_MS) return;
  inFlight = true;
  void refresh(ano).finally(() => {
    inFlight = false;
  });
}

/** Aguarda bulk do ano corrente (para merge com API REST). */
export async function refreshPlenarioHistoricoIfNeeded(): Promise<PlenarioHistoricoBulk | null> {
  const ano = new Date().getFullYear();
  if (cache.value?.ano === ano && Date.now() - cache.at < BULK_TTL_MS) return cache.value;
  if (inFlight) {
    await new Promise((r) => setTimeout(r, 500));
    return cache.value;
  }
  inFlight = true;
  try {
    await refresh(ano);
    return cache.value;
  } finally {
    inFlight = false;
  }
}

function parsePlacar(descricao: string): { sim: number; nao: number; outros: number } | null {
  const simM = descricao.match(/Sim:\s*(\d+)/i);
  const naoM = descricao.match(/N[aã]o:\s*(\d+)/i);
  if (!simM && !naoM) return null;
  const sim = simM ? Number.parseInt(simM[1], 10) : 0;
  const nao = naoM ? Number.parseInt(naoM[1], 10) : 0;
  const abstM = descricao.match(/absten[çc][aã]o:\s*(\d+)/i);
  const totalM = descricao.match(/[Tt]otal:\s*(\d+)/);
  const abst = abstM ? Number.parseInt(abstM[1], 10) : 0;
  const total = totalM ? Number.parseInt(totalM[1], 10) : sim + nao + abst;
  const outros = Math.max(abst, total - sim - nao);
  return { sim, nao, outros };
}

function placarDe(v: VotacaoBulk): { sim: number; nao: number; outros: number } {
  if ((v.votosSim ?? 0) > 0 || (v.votosNao ?? 0) > 0) {
    return {
      sim: v.votosSim ?? 0,
      nao: v.votosNao ?? 0,
      outros: v.votosOutros ?? 0,
    };
  }
  return parsePlacar(String(v.descricao ?? "")) ?? { sim: 0, nao: 0, outros: 0 };
}

function temPlacarUtil(p: { sim: number; nao: number; outros: number }): boolean {
  return p.sim + p.nao + p.outros > 0;
}

function normVoto(v: string | undefined): DeputadoVoto["tipoVoto"] {
  const s = (v ?? "").trim();
  if (s === "Sim" || s === "Não" || s === "Abstenção" || s === "Obstrução" || s === "Ausente") {
    return s;
  }
  if (/^n[aã]o$/i.test(s)) return "Não";
  if (/^sim$/i.test(s)) return "Sim";
  return "Ausente";
}

function toDeputadoVoto(r: VotoBulk): DeputadoVoto {
  return {
    deputado_: {
      nome: r.deputado_?.nome ?? "—",
      siglaPartido: r.deputado_?.siglaPartido ?? "—",
      siglaUf: r.deputado_?.siglaUf ?? "—",
      urlFoto: r.deputado_?.urlFoto,
    },
    tipoVoto: normVoto(r.voto),
  };
}

async function refresh(ano: number): Promise<void> {
  try {
    const [votacoesJson, votosJson] = await Promise.all([
      fetchBulk<{ dados?: VotacaoBulk[] }>(`${BULK_BASE}/votacoes/json/votacoes-${ano}.json`),
      fetchBulk<{ dados?: VotoBulk[] }>(`${BULK_BASE}/votacoesVotos/json/votacoesVotos-${ano}.json`),
    ]);
    const todas = votacoesJson?.dados ?? [];
    const todosVotos = votosJson?.dados ?? [];
    if (!todas.length) return;

    const siglasMonitor = new Set(ORGAOS_FIXOS.map((o) => o.sigla));
    const votacoesFiltradas = todas
      .filter((v) => v.siglaOrgao && siglasMonitor.has(v.siglaOrgao))
      .sort((a, b) => String(b.dataHoraRegistro ?? b.data).localeCompare(String(a.dataHoraRegistro ?? a.data)));

    const votoSostenesPorId = new Map<string, string>();
    for (const r of todosVotos) {
      if (r.deputado_?.id !== DEPUTADO_ID) continue;
      votoSostenesPorId.set(r.idVotacao, r.voto ?? "—");
    }

    const idsComNominal = new Set<string>();
    for (const r of todosVotos) idsComNominal.add(r.idVotacao);

    const historico: VotacaoHistoricoItem[] = [];
    for (const v of votacoesFiltradas) {
      if (historico.length >= HISTORICO_MAX) break;
      const placar = placarDe(v);
      if (!temPlacarUtil(placar) && !votoSostenesPorId.has(v.id)) continue;
      historico.push({
        id: v.id,
        titulo: String(v.descricao ?? "Votação").slice(0, 160),
        data: String(v.data ?? v.dataHoraRegistro ?? "").slice(0, 10),
        orgao: v.siglaOrgao ?? "—",
        sim: placar.sim,
        nao: placar.nao,
        outros: placar.outros,
        aprovacao: v.aprovacao === 1,
        votoSostenes: votoSostenesPorId.get(v.id) ?? null,
        temNominal: idsComNominal.has(v.id),
      });
    }

    const votacoesById = new Map(todas.map((v) => [v.id, v]));
    const votosDeputado: VotoDeputadoItem[] = [];
    const sostenesRows = todosVotos
      .filter((r) => r.deputado_?.id === DEPUTADO_ID)
      .sort((a, b) => String(b.dataHoraVoto).localeCompare(String(a.dataHoraVoto)));
    for (const r of sostenesRows) {
      if (votosDeputado.length >= VOTOS_DEPUTADO_MAX) break;
      const meta = votacoesById.get(r.idVotacao);
      votosDeputado.push({
        idVotacao: r.idVotacao,
        data: String(r.dataHoraVoto ?? meta?.data ?? "").slice(0, 10),
        voto: r.voto ?? "—",
        titulo: String(meta?.descricao ?? "Votação").slice(0, 140),
        orgao: meta?.siglaOrgao ?? "—",
      });
    }

    const nominais: Record<string, DeputadoVoto[]> = {};
    const alvoNominal = historico
      .filter((h) => h.orgao === "PLEN" && h.temNominal && h.votoSostenes)
      .slice(0, NOMINAL_VOTACOES_MAX);
    for (const h of alvoNominal) {
      nominais[h.id] = todosVotos
        .filter((r) => r.idVotacao === h.id)
        .map(toDeputadoVoto);
    }

    const value: PlenarioHistoricoBulk = {
      ano,
      orgaosMonitorados: ORGAOS_FIXOS.map(({ sigla, nome }) => ({ sigla, nome })),
      historico,
      votosDeputado,
      nominais,
    };

    cache = { at: Date.now(), value };
    persist(value);
  } catch {
    /* mantém último bom */
  }
}

async function fetchBulk<T>(url: string): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BULK_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function persist(value: PlenarioHistoricoBulk): void {
  try {
    writeFileSync(CACHE_FILE, `${JSON.stringify(value)}\n`);
  } catch {
    /* FS read-only */
  }
}

/** Maioria do PL numa votação nominal → orientação inferida; desviantes = traições. */
export function traicoesPLDeNominais(votos: DeputadoVoto[]): DeputadoVoto[] {
  const pl = votos.filter((v) => v.deputado_.siglaPartido === "PL");
  if (pl.length < 5) return [];
  let sim = 0;
  let nao = 0;
  for (const v of pl) {
    if (v.tipoVoto === "Sim") sim += 1;
    if (v.tipoVoto === "Não") nao += 1;
  }
  const orientacao: "Sim" | "Não" = sim >= nao ? "Sim" : "Não";
  return pl.filter(
    (v) => (v.tipoVoto === "Sim" || v.tipoVoto === "Não") && v.tipoVoto !== orientacao,
  );
}

export function fidelidadePLDeNominais(votos: DeputadoVoto[]): { com: number; total: number; pct: number } | null {
  const pl = votos.filter((v) => v.deputado_.siglaPartido === "PL");
  const validos = pl.filter((v) => v.tipoVoto === "Sim" || v.tipoVoto === "Não");
  if (validos.length < 5) return null;
  let sim = 0;
  let nao = 0;
  for (const v of validos) {
    if (v.tipoVoto === "Sim") sim += 1;
    else nao += 1;
  }
  const orientacao: "Sim" | "Não" = sim >= nao ? "Sim" : "Não";
  const com = validos.filter((v) => v.tipoVoto === orientacao).length;
  const total = validos.length;
  return { com, total, pct: Math.round((com / total) * 1000) / 10 };
}
