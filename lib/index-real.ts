// Índice de Popularidade Digital — a CONTA, por candidato, com dados REAIS.
//
// Calcula a tabela do índice para TODOS os candidatos de uma vez (a Posição vs.
// Adversários compara o candidato com a média do páreo, então precisa de todos
// juntos). Cards (/m) e a planilha auditável (/basecalculo) consomem esta mesma
// função — única fonte de verdade.
//
// Metodologia (briefing):
//   1. Cada ingrediente vira NOTA 0–100 centrada em 50 vs. a média do páreo:
//      nota = clamp(50 + 15 × (valor − média) ÷ desvio_típico, 0, 100)
//   2. Score = Σ (nota × peso), pesos de watchlist.pesosIndice, RENORMALIZADOS
//      sobre os ingredientes com dado real do candidato.
//   3. Índice de Posição = Score ÷ média(Scores) × 100  (100 = média do páreo).
//   4. Reputação = nota de sentimento. Tendência = Score agora vs. ~24h atrás.
//
// "100% real": só entra na conta o ingrediente com valor REAL do candidato; sem
// fonte real, a célula fica { valor:null, fonte:"indisponivel" } e é excluída.

import { getNewsImprensaFor } from "@/lib/sources/google-news";
import { recordScore, scoreAt } from "@/lib/sources/index-history";
import { getSentimentoRealFor } from "@/lib/sources/sentiment";
import { getMencoesRealFor } from "@/lib/sources/trends";
import { seguidoresReaisTotais } from "@/lib/live-mock-v2";
import type { Watchlist } from "@/lib/watchlist";

export const INGREDIENTES = ["mencoes", "sentimento", "imprensa", "seguidores"] as const;
export type Ingrediente = (typeof INGREDIENTES)[number];

export type Celula = {
  valor: number | null;
  nota: number | null;
  fonte: "real" | "indisponivel";
};

export type LinhaIndice = {
  simbolo: string;
  nome: string;
  cor: string;
  voce: boolean;
  ingredientes: Record<Ingrediente, Celula>;
  score: number | null; // nota composta 0–100
  reputacao: number | null; // = nota de sentimento (0–100)
  posicao: number | null; // score ÷ média(scores) × 100  (100 = média)
  tendencia: "up" | "flat" | "down";
};

export type TabelaIndice = {
  linhas: LinhaIndice[];
  mediaScore: number | null;
  pesos: Record<Ingrediente, number>;
  at: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TENDENCIA_LIMIAR = 1.5;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Valor real bruto de cada ingrediente para um candidato (termo = nome). */
function valorReal(w: Watchlist, simbolo: string, nome: string, ing: Ingrediente): number | null {
  switch (ing) {
    case "mencoes":
      return getMencoesRealFor(nome);
    case "sentimento":
      return getSentimentoRealFor(nome);
    case "imprensa":
      return getNewsImprensaFor(nome);
    case "seguidores":
      return seguidoresReaisTotais(w, simbolo);
  }
}

/** Nota 0–100 centrada em 50 vs. o páreo (z-score escalado). desvio 0 ⇒ 50. */
function notaZ(valor: number, valores: number[]): number {
  const n = valores.length;
  if (n === 0) return 50;
  const media = valores.reduce((a, b) => a + b, 0) / n;
  const variancia = valores.reduce((a, b) => a + (b - media) ** 2, 0) / n;
  const desvio = Math.sqrt(variancia);
  if (desvio === 0) return 50;
  return clamp(50 + 15 * ((valor - media) / desvio), 0, 100);
}

// Memo por instante: o stream constrói idx.sost e quotes.rj no mesmo `now` —
// computa a tabela (e o recordScore) uma única vez por tick.
let memo: { now: number; table: TabelaIndice } | null = null;

export function computeIndexTable(w: Watchlist, now: number): TabelaIndice {
  if (memo && memo.now === now) return memo.table;
  const table = buildIndexTable(w, now);
  memo = { now, table };
  return table;
}

function buildIndexTable(w: Watchlist, now: number): TabelaIndice {
  const pesos: Record<Ingrediente, number> = {
    mencoes: w.pesosIndice.mencoes,
    sentimento: w.pesosIndice.sentimento,
    imprensa: w.pesosIndice.imprensa,
    seguidores: w.pesosIndice.seguidores,
  };

  const candidatos = [
    { simbolo: w.principal.simbolo, nome: w.principal.nome, cor: w.principal.cor, voce: true },
    ...w.concorrentes_rj.map((c) => ({ simbolo: c.simbolo, nome: c.nome, cor: c.cor, voce: false })),
  ];

  // 1) valores brutos reais por ingrediente
  const brutos = candidatos.map((c) => {
    const ing = {} as Record<Ingrediente, number | null>;
    for (const k of INGREDIENTES) ing[k] = valorReal(w, c.simbolo, c.nome, k);
    return ing;
  });

  // 2) notas (z-score) por ingrediente, só sobre quem tem valor real
  const linhas: LinhaIndice[] = candidatos.map((c, i) => {
    const ingredientes = {} as Record<Ingrediente, Celula>;
    for (const k of INGREDIENTES) {
      const valor = brutos[i][k];
      if (valor === null) {
        ingredientes[k] = { valor: null, nota: null, fonte: "indisponivel" };
        continue;
      }
      const presentes = brutos.map((b) => b[k]).filter((v): v is number => v !== null);
      ingredientes[k] = { valor: round1(valor), nota: round1(notaZ(valor, presentes)), fonte: "real" };
    }

    // 3) Score = Σ nota × peso, renormalizado sobre ingredientes presentes
    let somaPeso = 0;
    let somaPond = 0;
    for (const k of INGREDIENTES) {
      const nota = ingredientes[k].nota;
      if (nota === null) continue;
      somaPeso += pesos[k];
      somaPond += nota * pesos[k];
    }
    const score = somaPeso > 0 ? round1(somaPond / somaPeso) : null;

    return {
      simbolo: c.simbolo,
      nome: c.nome,
      cor: c.cor,
      voce: c.voce,
      ingredientes,
      score,
      reputacao: ingredientes.sentimento.nota,
      posicao: null as number | null, // preenchido abaixo
      tendencia: "flat" as "up" | "flat" | "down",
    };
  });

  // 4) Índice de Posição (100 = média) + Tendência (vs. ~24h atrás)
  const scores = linhas.map((l) => l.score).filter((s): s is number => s !== null);
  const mediaScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  for (const l of linhas) {
    if (l.score !== null && mediaScore && mediaScore > 0) {
      l.posicao = round1((l.score / mediaScore) * 100);
      recordScore(now, l.simbolo, l.score);
      const anterior = scoreAt(l.simbolo, now - DAY_MS);
      if (anterior !== null) {
        const delta = l.score - anterior;
        l.tendencia = delta > TENDENCIA_LIMIAR ? "up" : delta < -TENDENCIA_LIMIAR ? "down" : "flat";
      }
    }
  }

  return { linhas, mediaScore: mediaScore !== null ? round1(mediaScore) : null, pesos, at: now };
}
