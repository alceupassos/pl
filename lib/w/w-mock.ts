// Mock determinístico para /w — dados sintéticos enquanto fontes reais não estão plugadas.
// Funções puras do tempo: f(seed, t) → valor idêntico em qualquer reconexão.

export type Cargo = "presidente" | "governador_rj" | "senador_rj" | "dep_federal_rj";

export type MarketEntry = {
  cargo: Cargo;
  candidato: string;
  partido: string;
  cor: string;
  probVencer: number;
  probTop2: number;
  pct: number;
  delta7d: number;
  tendencia: "up" | "down" | "flat";
  historico30d: number[];
  fonteReal: boolean;
};

export type PesquisaEntry = {
  id: string;
  instituto: string;
  dataRegistro: string;
  cargo: Cargo;
  candidato: string;
  pct: number;
  n: number;
  margemErro: number;
  fonteReal: boolean;
};

export type CandidatoEntry = {
  nome: string;
  nomeUrna: string;
  partido: string;
  cargo: Cargo;
  uf: string;
  numero: string;
  cor: string;
};

function seedHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function frac(s: string): number {
  return (seedHash(s) % 1000) / 1000;
}

const PRESIDENTE_CANDIDATOS = [
  { candidato: "Lula", partido: "PT", cor: "#E11D48" },
  { candidato: "Flávio Bolsonaro", partido: "PL", cor: "#3B82F6" },
  { candidato: "Tarcísio de Freitas", partido: "Republicanos", cor: "#F59E0B" },
  { candidato: "Renan Santos", partido: "PL", cor: "#8B5CF6" },
];

const GOV_RJ_CANDIDATOS = [
  { candidato: "Cláudio Castro", partido: "PL", cor: "#3B82F6" },
  { candidato: "Eduardo Paes", partido: "PSD", cor: "#06B6D4" },
  { candidato: "Felipe Santa Cruz", partido: "PSD", cor: "#10B981" },
];

const SEN_RJ_CANDIDATOS = [
  { candidato: "Carlos Portinho", partido: "PL", cor: "#3B82F6" },
  { candidato: "Alessandro Molon", partido: "PSB", cor: "#EF4444" },
  { candidato: "Rodrigo Bacellar", partido: "UB", cor: "#F59E0B" },
];

const DEP_FED_RJ_CANDIDATOS = [
  { candidato: "Sóstenes Cavalcante", partido: "PL", cor: "#16C784" },
  { candidato: "Carlos Jordy", partido: "PL", cor: "#3B82F6" },
  { candidato: "Talíria Petrone", partido: "PSOL", cor: "#EF4444" },
  { candidato: "Dr. Luizinho", partido: "PP", cor: "#F59E0B" },
  { candidato: "Daniela do Waguinho", partido: "UB", cor: "#8B5CF6" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function buildMarket(
  cargo: Cargo,
  lista: { candidato: string; partido: string; cor: string }[],
  now: number,
): MarketEntry[] {
  const total = lista.reduce((s, c) => s + frac(`${c.candidato}:pct`), 0);
  return lista.map((c) => {
    const base = frac(`${c.candidato}:pct`) / total;
    const noise = Math.sin(now / (7 * DAY_MS) + seedHash(c.candidato)) * 0.015;
    const pct = Math.max(3, Math.round((base + noise) * 100));
    const delta7d =
      Math.round(
        Math.sin(now / (14 * DAY_MS) + seedHash(c.candidato) * 0.3) * 4 * 10,
      ) / 10;
    return {
      cargo,
      candidato: c.candidato,
      partido: c.partido,
      cor: c.cor,
      probVencer: Math.round(
        (base * 0.85 + 0.05 + Math.sin(now / DAY_MS + seedHash(c.candidato)) * 0.03) * 100,
      ) / 100,
      probTop2: Math.min(0.98, Math.round((base * 1.1 + 0.1) * 100) / 100),
      pct,
      delta7d,
      tendencia: delta7d > 0.5 ? "up" : delta7d < -0.5 ? "down" : "flat",
      historico30d: Array.from({ length: 30 }, (_, i) =>
        Math.max(
          2,
          Math.round(
            (pct + Math.sin((now / DAY_MS - 29 + i) * 0.7 + seedHash(c.candidato)) * 3) * 10,
          ) / 10,
        ),
      ),
      fonteReal: false,
    };
  });
}

export function snapshotMercados(now: number): Record<Cargo, MarketEntry[]> {
  return {
    presidente: buildMarket("presidente", PRESIDENTE_CANDIDATOS, now),
    governador_rj: buildMarket("governador_rj", GOV_RJ_CANDIDATOS, now),
    senador_rj: buildMarket("senador_rj", SEN_RJ_CANDIDATOS, now),
    dep_federal_rj: buildMarket("dep_federal_rj", DEP_FED_RJ_CANDIDATOS, now),
  };
}

export function snapshotPesquisas(now: number): PesquisaEntry[] {
  const institutos = ["Datafolha", "Quaest", "AtlasIntel", "PoderData", "Paraná Pesquisas"];
  const result: PesquisaEntry[] = [];
  for (const inst of institutos) {
    const daysBack = Math.floor(frac(`${inst}:days`) * 14);
    const data = new Date(now - daysBack * DAY_MS).toISOString().slice(0, 10);
    for (const c of PRESIDENTE_CANDIDATOS) {
      result.push({
        id: `${inst}-${c.candidato}-${data}`,
        instituto: inst,
        dataRegistro: data,
        cargo: "presidente",
        candidato: c.candidato,
        pct: Math.max(3, Math.round(frac(`${inst}:${c.candidato}:pct`) * 40 + 5)),
        n: 800 + Math.floor(frac(`${inst}:n`) * 4200),
        margemErro: Math.round((2 + frac(`${inst}:me`) * 2) * 10) / 10,
        fonteReal: false,
      });
    }
  }
  return result.sort((a, b) => b.dataRegistro.localeCompare(a.dataRegistro));
}

export function snapshotCandidatos(): CandidatoEntry[] {
  return [
    ...PRESIDENTE_CANDIDATOS.map((c, i) => ({
      nome: c.candidato,
      nomeUrna: c.candidato.toUpperCase(),
      partido: c.partido,
      cor: c.cor,
      cargo: "presidente" as Cargo,
      uf: "BR",
      numero: `${13 + i}`,
    })),
    ...GOV_RJ_CANDIDATOS.map((c, i) => ({
      nome: c.candidato,
      nomeUrna: c.candidato.toUpperCase(),
      partido: c.partido,
      cor: c.cor,
      cargo: "governador_rj" as Cargo,
      uf: "RJ",
      numero: `${40 + i}`,
    })),
    ...SEN_RJ_CANDIDATOS.map((c, i) => ({
      nome: c.candidato,
      nomeUrna: c.candidato.toUpperCase(),
      partido: c.partido,
      cor: c.cor,
      cargo: "senador_rj" as Cargo,
      uf: "RJ",
      numero: `${100 + i}`,
    })),
    ...DEP_FED_RJ_CANDIDATOS.map((c, i) => ({
      nome: c.candidato,
      nomeUrna: c.candidato.toUpperCase(),
      partido: c.partido,
      cor: c.cor,
      cargo: "dep_federal_rj" as Cargo,
      uf: "RJ",
      numero: `${1700 + i}`,
    })),
  ];
}
