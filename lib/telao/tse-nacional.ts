// Panorama nacional da apuração 2026: governadores, Senado, Câmara dos
// Deputados e Assembleias das 27 UFs, agregado a partir dos mesmos JSONs
// oficiais do TSE usados pelo telão estadual (getApuracao, cache de 5 min).
//
// São 27 × 4 = 108 arquivos. O CDN do TSE devolve 429 se apertarmos demais,
// então buscamos com concorrência baixa e servimos o último panorama pronto
// enquanto o próximo é montado em segundo plano (stale-while-revalidate).

import { REGIAO, UFS, UF_NOME, getApuracao, type Apuracao, type CandApurado, type PleitoId } from "./tse-apuracao";

export type CandResumo = Pick<CandApurado, "sq" | "num" | "nome" | "partido" | "votos" | "pct" | "eleito" | "situacao">;

export type UFMajoritario = {
  uf: string;
  nome: string;
  regiao: string;
  status: Apuracao["status"];
  pctUrnas: number;
  vagas: number;
  fotoBase: string;
  cand: CandResumo[]; // top 4
  /** "eleito" | "2turno" | "lidera" | "aguardando" (governador) ; senado: "eleitos" | "parcial" */
  situacao: string;
};

export type BancadaPartido = { partido: string; vagas: number; votos: number };

export type Casa = {
  nome: string;
  vagas: number;
  maioria: number;
  ufsApurando: number;
  ufsComDados: number;
  oficial: boolean; // todas as UFs com vagas distribuídas pelo TSE
  partidos: BancadaPartido[];
  porUF: { uf: string; vagas: number; pctUrnas: number; qeProjetado: number; corteProjetado: number; base: string; status: Apuracao["status"] }[];
};

export type Panorama = {
  geradoEm: string;
  pctUrnasMedia: number;
  territorios: { uf: string; pleito: PleitoId; status: Apuracao["status"]; secoesTot: number; secoesTotal: number; votosValidos: number }[];
  presidencia: UFMajoritario[];
  governadores: UFMajoritario[];
  senado: UFMajoritario[];
  casaSenado: Casa; // vagas em disputa (2/3 = 54)
  camara: Casa;
  assembleias: Casa;
  governadoresPorPartido: { partido: string; eleitos: number; lideram: number }[];
};

const resumo = (c: CandApurado): CandResumo => ({
  sq: c.sq,
  num: c.num,
  nome: c.nome,
  partido: c.partido,
  votos: c.votos,
  pct: c.pct,
  eleito: c.eleito,
  situacao: c.situacao,
});

function situacaoGov(a: Apuracao): string {
  if (a.status === "aguardando" || !a.cand.length || !a.votosValidos) return "aguardando";
  const [l] = a.cand;
  if (l.eleito || /^eleito/i.test(l.situacao)) return "eleito";
  if (a.cand.some((c) => /2º turno|2o turno/i.test(c.situacao))) return "2turno";
  if (a.status === "finalizado") return l.pct > 50 ? "eleito" : "2turno";
  return "lidera";
}

/** Eleitos (oficiais) ou projetados de uma casa proporcional, por partido. */
function eleitosProporcional(a: Apuracao): CandApurado[] {
  const oficiais = a.cand.filter((c) => c.eleito);
  if (oficiais.length) return oficiais;
  if (!a.votosValidos) return [];
  const qe = a.quocienteEleitoral;
  if (!a.partidos.some((p) => p.vagas > 0)) return a.cand.slice(0, a.vagas);
  const out: CandApurado[] = [];
  for (const p of a.partidos) {
    if (!p.vagas) continue;
    // mais votados da agremiação; quem não fez 10% do QE cede a vaga ao próximo
    const lista = a.cand.filter((c) => c.agremiacao === p.sigla);
    const aptos = lista.filter((c) => c.votos >= 0.1 * qe);
    out.push(...(aptos.length >= p.vagas ? aptos : lista).slice(0, p.vagas));
  }
  return out;
}

function somaPartidos(listas: CandApurado[][]): BancadaPartido[] {
  const m = new Map<string, BancadaPartido>();
  for (const l of listas)
    for (const c of l) {
      const b = m.get(c.partido) ?? { partido: c.partido, vagas: 0, votos: 0 };
      b.vagas++;
      b.votos += c.votos;
      m.set(c.partido, b);
    }
  return [...m.values()].sort((a, b) => b.vagas - a.vagas || b.votos - a.votos);
}

function casa(nome: string, aps: Apuracao[], vagasPadrao: number): Casa {
  const eleitos = aps.map(eleitosProporcional);
  const vagas = aps.reduce((t, a) => t + (a.vagas || 0), 0) || vagasPadrao;
  return {
    nome,
    vagas,
    maioria: Math.floor(vagas / 2) + 1,
    ufsApurando: aps.filter((a) => a.status === "apurando" || a.status === "finalizado").length,
    ufsComDados: aps.filter((a) => a.vagas > 0).length,
    oficial: aps.every((a) => a.cand.some((c) => c.eleito)),
    partidos: somaPartidos(eleitos),
    porUF: aps.map((a) => ({
      uf: a.uf,
      status: a.status,
      vagas: a.vagas,
      pctUrnas: a.pctUrnas,
      qeProjetado: a.necessidade?.qeProjetado ?? 0,
      corteProjetado: a.necessidade?.corteProjetado ?? 0,
      base: a.necessidade?.base ?? "",
    })),
  };
}

/** Executa as tarefas com no máximo `n` simultâneas. */
async function pool<T>(tarefas: (() => Promise<T>)[], n: number): Promise<T[]> {
  const out: T[] = new Array(tarefas.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < tarefas.length) {
        const k = i++;
        out[k] = await tarefas[k]();
      }
    }),
  );
  return out;
}

async function montar(): Promise<Panorama> {
  const cargos: PleitoId[] = ["presidente", "governador-sp", "senador-sp", "dep-federal-sp", "dep-estadual-sp"];
  const tarefas = UFS.flatMap((uf) => cargos.map((pl) => () => getApuracao(pl, { uf, regional: pl === "presidente" })));
  const res = await pool(tarefas, 4);
  const de = (uf: string, pl: PleitoId) => res[UFS.indexOf(uf) * cargos.length + cargos.indexOf(pl)];

  const maj = (uf: string, pl: PleitoId): UFMajoritario => {
    const a = de(uf, pl);
    return {
      uf,
      nome: UF_NOME[uf],
      regiao: REGIAO[uf],
      status: a.status,
      pctUrnas: a.pctUrnas,
      vagas: a.vagas || (pl === "senador-sp" ? 2 : 1),
      fotoBase: a.fotoBase,
      cand: a.cand.slice(0, 4).map(resumo),
      situacao:
        pl === "governador-sp"
          ? situacaoGov(a)
          : a.status === "aguardando" || !a.votosValidos
            ? "aguardando"
            : a.cand.some((c) => c.eleito) || a.status === "finalizado"
              ? "eleitos"
              : "parcial",
    };
  };

  const governadores = UFS.map((uf) => maj(uf, "governador-sp"));
  const senado = UFS.map((uf) => maj(uf, "senador-sp"));

  // Senado: eleitos (oficiais) ou os N mais votados de cada UF
  const senEleitos = UFS.map((uf) => {
    const a = de(uf, "senador-sp");
    if (!a.votosValidos) return [];
    const of = a.cand.filter((c) => c.eleito);
    return of.length ? of : a.cand.slice(0, a.vagas || 2);
  });
  const vagasSen = senado.reduce((t, s) => t + s.vagas, 0);
  const casaSenado: Casa = {
    nome: "Senado Federal",
    vagas: vagasSen,
    maioria: 41, // de 81 (a casa inteira)
    ufsApurando: senado.filter((s) => s.situacao !== "aguardando").length,
    ufsComDados: senado.length,
    oficial: senado.every((s) => s.situacao === "eleitos"),
    partidos: somaPartidos(senEleitos),
    porUF: [],
  };

  const govPart = new Map<string, { partido: string; eleitos: number; lideram: number }>();
  for (const g of governadores) {
    const l = g.cand[0];
    if (!l || g.situacao === "aguardando") continue;
    const x = govPart.get(l.partido) ?? { partido: l.partido, eleitos: 0, lideram: 0 };
    if (g.situacao === "eleito") x.eleitos++;
    else x.lideram++;
    govPart.set(l.partido, x);
  }

  const urnas = res.filter((a) => a.pleito === "presidente");
  const secoes = urnas.reduce((s, a) => s + a.secoesTotal, 0);
  const totalizadas = urnas.reduce((s, a) => s + a.secoesTot, 0);
  return {
    geradoEm: new Date().toISOString(),
    pctUrnasMedia: secoes ? 100 * totalizadas / secoes : 0,
    territorios: res.map(a => ({ uf: a.uf, pleito: a.pleito, status: a.status, secoesTot: a.secoesTot, secoesTotal: a.secoesTotal, votosValidos: a.votosValidos })),
    presidencia: UFS.map((uf) => maj(uf, "presidente")),
    governadores,
    senado,
    casaSenado,
    camara: casa("Câmara dos Deputados", UFS.map((uf) => de(uf, "dep-federal-sp")), 513),
    assembleias: casa("Assembleias Legislativas", UFS.map((uf) => de(uf, "dep-estadual-sp")), 1059),
    governadoresPorPartido: [...govPart.values()].sort((a, b) => b.eleitos + b.lideram - (a.eleitos + a.lideram)),
  };
}

const TTL = 5 * 60_000;
let pronto: { at: number; data: Panorama } | null = null;
let montando: Promise<Panorama> | null = null;

function revalidar(): Promise<Panorama> {
  if (!montando)
    montando = montar()
      .then((data) => {
        pronto = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        montando = null;
      });
  return montando;
}

export async function getPanorama(): Promise<Panorama> {
  if (pronto) {
    if (Date.now() - pronto.at > TTL) revalidar().catch(() => {});
    return pronto.data;
  }
  return revalidar();
}
