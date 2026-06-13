// Fonte REAL de plenário — Câmara Dados Abertos (JSON, sem chave).
// Camada 1: API REST (votações recentes do Plenário, órgão 180).
// Camada 2: arquivos bulk anuais (comissões CCJC etc. + votos nominais do dep. 178947).
// https://dadosabertos.camara.leg.br/swagger/api.html

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { DeputadoVoto } from "@/lib/live-schemas";
import {
  fidelidadePLDeNominais,
  getPlenarioHistoricoBulk,
  ensureFreshPlenarioHistorico,
  refreshPlenarioHistoricoIfNeeded,
  traicoesPLDeNominais,
  type PlenarioHistoricoBulk,
  type VotacaoHistoricoItem,
  type VotoDeputadoItem,
} from "@/lib/sources/plenario-bulk";

const TTL_MS = 60 * 60 * 1000; // 1h
const FETCH_TIMEOUT_MS = 25_000;
const CACHE_FILE = join(process.cwd(), "data", "plenario-cache.json");
const BASE = "https://dadosabertos.camara.leg.br/api/v2";
const ORGAO_PLENARIO = 180;

export type PlenarioVotacaoReal = {
  id: string;
  titulo: string;
  orientacaoPL: "Sim" | "Não";
  sim: number;
  nao: number;
  outros: number;
  emAndamento: boolean;
  orgao: string;
  traicoes: DeputadoVoto[];
};

export type PlenarioReal = {
  votacao: PlenarioVotacaoReal | null;
  /** Última votação com placar — exibida quando não há sessão ao vivo. */
  votacaoRecente: PlenarioVotacaoReal | null;
  historico: VotacaoHistoricoItem[];
  votosDeputado: VotoDeputadoItem[];
  orgaosMonitorados: { sigla: string; nome: string }[];
  nominais: Record<string, DeputadoVoto[]>;
  votacoesRecentes: { id: string; titulo: string; data: string; tipoVotoDeputado: string }[];
  presencaPct: number | null;
};

let cache: { at: number; value: PlenarioReal | null } = { at: 0, value: null };
let inFlight = false;

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && typeof raw === "object") cache = { at: 0, value: raw as PlenarioReal };
  } catch {
    /* primeira execução */
  }
})();

export function getPlenarioReal(): PlenarioReal | null {
  return cache.value;
}

export function ensureFreshPlenario(): void {
  ensureFreshPlenarioHistorico();
  if (inFlight) return;
  if (Date.now() - cache.at < TTL_MS && cache.value !== null) return;
  inFlight = true;
  void refresh().finally(() => {
    inFlight = false;
  });
}

type VotacaoRaw = {
  id?: string | number;
  data?: string;
  dataHoraRegistro?: string;
  descricao?: string;
  aprovacao?: number;
  siglaOrgao?: string;
};

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

function dataInicioDiasAtras(dias: number): string {
  const d = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function votacaoFromRaw(
  raw: VotacaoRaw,
  placar: { sim: number; nao: number; outros: number },
  emAndamento: boolean,
  nominais: DeputadoVoto[],
): PlenarioVotacaoReal {
  const orientacaoPL: "Sim" | "Não" = raw.aprovacao === 1 ? "Sim" : "Não";
  const traicoes = nominais.length ? traicoesPLDeNominais(nominais) : [];
  return {
    id: String(raw.id ?? ""),
    titulo: String(raw.descricao ?? "Votação").slice(0, 160),
    orientacaoPL,
    sim: placar.sim,
    nao: placar.nao,
    outros: placar.outros,
    emAndamento,
    orgao: raw.siglaOrgao ?? "PLEN",
    traicoes,
  };
}

function votacaoFromHistorico(
  h: VotacaoHistoricoItem,
  nominais: DeputadoVoto[],
): PlenarioVotacaoReal {
  const orientacaoPL: "Sim" | "Não" = h.aprovacao ? "Sim" : "Não";
  return {
    id: h.id,
    titulo: h.titulo,
    orientacaoPL,
    sim: h.sim,
    nao: h.nao,
    outros: h.outros,
    emAndamento: false,
    orgao: h.orgao,
    traicoes: nominais.length ? traicoesPLDeNominais(nominais) : [],
  };
}

function mergeComBulk(
  apiVotacao: PlenarioVotacaoReal | null,
  apiRecentes: PlenarioReal["votacoesRecentes"],
  bulk: PlenarioHistoricoBulk | null,
): PlenarioReal {
  const historico = bulk?.historico ?? [];
  const votosDeputado = bulk?.votosDeputado ?? [];
  const orgaosMonitorados = bulk?.orgaosMonitorados ?? [];
  const nominais = bulk?.nominais ?? {};

  let votacaoRecente: PlenarioVotacaoReal | null = null;
  if (apiVotacao && !apiVotacao.emAndamento) {
    votacaoRecente = apiVotacao;
  } else if (historico.length) {
    const h = historico.find((x) => x.sim + x.nao + x.outros > 0) ?? historico[0];
    votacaoRecente = votacaoFromHistorico(h, nominais[h.id] ?? []);
  }

  const votacoesRecentes =
    apiRecentes.length > 0
      ? apiRecentes.map((v) => {
          const dep = votosDeputado.find((d) => d.idVotacao === v.id);
          return dep ? { ...v, tipoVotoDeputado: dep.voto } : v;
        })
      : historico.slice(0, 12).map((h) => ({
          id: h.id,
          titulo: h.titulo,
          data: h.data,
          tipoVotoDeputado: h.votoSostenes ?? "—",
        }));

  return {
    votacao: apiVotacao?.emAndamento ? apiVotacao : null,
    votacaoRecente,
    historico,
    votosDeputado,
    orgaosMonitorados,
    nominais,
    votacoesRecentes,
    presencaPct: null,
  };
}

async function refresh(): Promise<void> {
  try {
    const bulk = (await refreshPlenarioHistoricoIfNeeded()) ?? getPlenarioHistoricoBulk();

    const params = new URLSearchParams({
      idOrgao: String(ORGAO_PLENARIO),
      dataInicio: dataInicioDiasAtras(120),
      ordem: "DESC",
      ordenarPor: "dataHoraRegistro",
      itens: "40",
    });
    const votacoes = await fetchJson<{ dados?: VotacaoRaw[] }>(`${BASE}/votacoes?${params}`);
    const lista = votacoes?.dados ?? [];

    if (!lista.length && !bulk?.historico.length) return;

    const votacoesRecentes = lista.slice(0, 12).map((v) => ({
      id: String(v.id ?? ""),
      titulo: String(v.descricao ?? "Votação").slice(0, 120),
      data: String(v.data ?? v.dataHoraRegistro ?? "").slice(0, 10),
      tipoVotoDeputado: "—",
    }));

    let apiVotacao: PlenarioVotacaoReal | null = null;
    if (lista.length) {
      const comPlacar = lista.find((v) => parsePlacar(String(v.descricao ?? "")));
      const ultima = comPlacar ?? lista[0];
      const descricao = String(ultima.descricao ?? "Votação em plenário");
      const placar = parsePlacar(descricao);
      const votacaoId = ultima.id;
      if (votacaoId && placar) {
        const registro = ultima.dataHoraRegistro ?? ultima.data;
        const tReg = registro ? Date.parse(registro) : 0;
        const emAndamento = tReg > 0 && Date.now() - tReg < 3 * 60 * 60 * 1000;
        const idStr = String(votacaoId);
        const nom = bulk?.nominais[idStr] ?? [];
        apiVotacao = votacaoFromRaw(ultima, placar, emAndamento, nom);
      }
    }

    const value = mergeComBulk(apiVotacao, votacoesRecentes, bulk);
    cache = { at: Date.now(), value };
    persist(value);
  } catch {
    /* mantém último bom */
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
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

function persist(value: PlenarioReal): void {
  try {
    writeFileSync(CACHE_FILE, `${JSON.stringify(value)}\n`);
  } catch {
    /* FS read-only */
  }
}

export { fidelidadePLDeNominais, traicoesPLDeNominais };
