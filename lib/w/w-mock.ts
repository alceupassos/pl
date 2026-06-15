// Mock determinístico para /w — dados sintéticos enquanto fontes reais não estão plugadas.
// Funções puras do tempo: f(seed, t) → valor idêntico em qualquer reconexão.

export type Cargo =
  | "presidente"
  | "governador_sp"
  | "governador_rj"
  | "senador_rj"
  | "dep_federal_rj";

type CandDef = {
  candidato: string;
  partido: string;
  cor: string;
  /** Base de intenção de voto (0–1). Se omitido, usa hash determinístico. */
  base?: number;
};

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

// Presidente 2026 — sem Tarcísio (candidato a Gov SP)
const PRESIDENTE_CANDIDATOS: CandDef[] = [
  { candidato: "Lula", partido: "PT", cor: "#E11D48", base: 0.36 },
  { candidato: "Flávio Bolsonaro", partido: "PL", cor: "#3B82F6", base: 0.26 },
  {
    candidato: "Renan Santos",
    partido: "Missão Pátria",
    cor: "#8B5CF6",
    base: 0.12,
  },
  { candidato: "Ronaldo Caiado", partido: "União", cor: "#F59E0B", base: 0.1 },
];

// Governador SP 2026 — Tarcísio forte favorito como incumbente
const GOV_SP_CANDIDATOS: CandDef[] = [
  {
    candidato: "Tarcísio de Freitas",
    partido: "Republicanos",
    cor: "#F59E0B",
    base: 0.58,
  },
  { candidato: "Márcio França", partido: "PSB", cor: "#06B6D4", base: 0.16 },
  {
    candidato: "Guilherme Boulos",
    partido: "PSOL",
    cor: "#EF4444",
    base: 0.14,
  },
];

// Governador RJ 2026 — Castro não é candidato; Paes favorito
const GOV_RJ_CANDIDATOS: CandDef[] = [
  { candidato: "Eduardo Paes", partido: "PSD", cor: "#06B6D4", base: 0.44 },
  {
    candidato: "Clarissa Garotinho",
    partido: "União",
    cor: "#A855F7",
    base: 0.18,
  },
  { candidato: "Rodrigo Neves", partido: "PDT", cor: "#10B981", base: 0.14 },
];

const SEN_RJ_CANDIDATOS: CandDef[] = [
  { candidato: "Carlos Portinho", partido: "PL", cor: "#3B82F6" },
  { candidato: "Alessandro Molon", partido: "PSB", cor: "#EF4444" },
  { candidato: "Rodrigo Bacellar", partido: "UB", cor: "#F59E0B" },
];

const DEP_FED_RJ_CANDIDATOS: CandDef[] = [
  { candidato: "Sóstenes Cavalcante", partido: "PL", cor: "#16C784" },
  { candidato: "Carlos Jordy", partido: "PL", cor: "#3B82F6" },
  { candidato: "Talíria Petrone", partido: "PSOL", cor: "#EF4444" },
  { candidato: "Dr. Luizinho", partido: "PP", cor: "#F59E0B" },
  { candidato: "Daniela do Waguinho", partido: "UB", cor: "#8B5CF6" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function buildMarket(
  cargo: Cargo,
  lista: CandDef[],
  now: number,
): MarketEntry[] {
  // Usa base explícita quando disponível; caso contrário normaliza frac()
  const rawBases = lista.map((c) =>
    c.base !== undefined ? c.base : frac(`${c.candidato}:pct`),
  );
  const totalBase = rawBases.reduce((s, v) => s + v, 0);
  const bases = rawBases.map((v) => v / totalBase);

  return lista.map((c, idx) => {
    const base = bases[idx];
    const noise = Math.sin(now / (7 * DAY_MS) + seedHash(c.candidato)) * 0.012;
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
      probVencer:
        Math.round(
          (base * 0.9 +
            0.03 +
            Math.sin(now / DAY_MS + seedHash(c.candidato)) * 0.02) *
            100,
        ) / 100,
      probTop2: Math.min(0.98, Math.round((base * 1.1 + 0.08) * 100) / 100),
      pct,
      delta7d,
      tendencia: delta7d > 0.5 ? "up" : delta7d < -0.5 ? "down" : "flat",
      historico30d: Array.from({ length: 30 }, (_, i) =>
        Math.max(
          2,
          Math.round(
            (pct +
              Math.sin((now / DAY_MS - 29 + i) * 0.7 + seedHash(c.candidato)) *
                3) *
              10,
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
    governador_sp: buildMarket("governador_sp", GOV_SP_CANDIDATOS, now),
    governador_rj: buildMarket("governador_rj", GOV_RJ_CANDIDATOS, now),
    senador_rj: buildMarket("senador_rj", SEN_RJ_CANDIDATOS, now),
    dep_federal_rj: buildMarket("dep_federal_rj", DEP_FED_RJ_CANDIDATOS, now),
  };
}

export function snapshotPesquisas(now: number): PesquisaEntry[] {
  const institutos = [
    "Datafolha",
    "Quaest",
    "AtlasIntel",
    "PoderData",
    "Paraná Pesquisas",
  ];
  const result: PesquisaEntry[] = [];

  for (const inst of institutos) {
    const daysBack = Math.floor(frac(`${inst}:days`) * 14);
    const data = new Date(now - daysBack * DAY_MS).toISOString().slice(0, 10);

    // Presidente
    for (const c of PRESIDENTE_CANDIDATOS) {
      const basePct =
        c.base !== undefined
          ? Math.round(
              c.base * 100 + (frac(`${inst}:${c.candidato}:noise`) - 0.5) * 8,
            )
          : Math.max(
              3,
              Math.round(frac(`${inst}:${c.candidato}:pct`) * 30 + 5),
            );
      result.push({
        id: `${inst}-pres-${c.candidato}-${data}`,
        instituto: inst,
        dataRegistro: data,
        cargo: "presidente",
        candidato: c.candidato,
        pct: Math.max(3, basePct),
        n: 800 + Math.floor(frac(`${inst}:n`) * 4200),
        margemErro: Math.round((2 + frac(`${inst}:me`) * 2) * 10) / 10,
        fonteReal: false,
      });
    }

    // Governador SP
    for (const c of GOV_SP_CANDIDATOS) {
      const basePct =
        c.base !== undefined
          ? Math.round(
              c.base * 100 + (frac(`${inst}:${c.candidato}:noise`) - 0.5) * 6,
            )
          : Math.max(
              3,
              Math.round(frac(`${inst}:${c.candidato}:pct`) * 25 + 5),
            );
      result.push({
        id: `${inst}-govsp-${c.candidato}-${data}`,
        instituto: inst,
        dataRegistro: data,
        cargo: "governador_sp",
        candidato: c.candidato,
        pct: Math.max(3, basePct),
        n: 800 + Math.floor(frac(`${inst}:n:sp`) * 3000),
        margemErro: Math.round((2.5 + frac(`${inst}:me:sp`) * 1.5) * 10) / 10,
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
    ...GOV_SP_CANDIDATOS.map((c, i) => ({
      nome: c.candidato,
      nomeUrna: c.candidato.toUpperCase(),
      partido: c.partido,
      cor: c.cor,
      cargo: "governador_sp" as Cargo,
      uf: "SP",
      numero: `${22 + i}`,
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
