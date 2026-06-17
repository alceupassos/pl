// Índice de Popularidade Digital — a CONTA, por candidato, com dados REAIS.
//
// Calcula a tabela do índice para TODOS os candidatos de uma vez (a Posição vs.
// Adversários compara o candidato com a média do páreo, então precisa de todos
// juntos). Cards (/m) e a planilha auditável (/basecalculo) consomem esta mesma
// função — única fonte de verdade.
//
// Metodologia (briefing):
//   1. Cada ingrediente vira NOTA 0–100 centrada em 50 vs. a média do páreo:
//      nota = clamp(50 + 20 × (valor − média) ÷ desvio_típico, 0, 100)
//      Pilares: Sentimento, Menções, Imprensa e Crescimento da base (este último
//      entra como a VARIAÇÃO % de seguidores nos últimos 7 dias — não a base total).
//   2. IRE (Índice de Reputação Eleitoral) = Σ (nota × peso), pesos de
//      watchlist.pesosIndice (Sentimento 40% · Menções 25% · Imprensa 20% ·
//      Crescimento 15%), RENORMALIZADOS sobre os ingredientes com dado real. É o
//      número-título: o "Score" e o IRE são o mesmo número.
//   3. PRA (Posição Relativa Adversários) = (IRE ÷ média × 100) − 100, em %
//      (0 = na média; positivo = à frente dos adversários; negativo = atrás).
//   4. TIRE = tendência do IRE do candidato em 7 dias; TPRA = média das tendências
//      (ΔIRE 7d) dos concorrentes.
//
// "100% real": só entra na conta o ingrediente com valor REAL do candidato; sem
// fonte real, a célula fica { valor:null, fonte:"indisponivel" } e é excluída.

import { getNewsImprensaFor } from "@/lib/sources/google-news";
import { recordScore, recordIre, ireAt } from "@/lib/sources/index-history";
import { recordSeguidores, seguidoresAt } from "@/lib/sources/seguidores-history";
import { getSentimentoRealFor } from "@/lib/sources/sentiment";
// Menções = atenção pública via Wikipedia pageviews (open-source, por candidato).
// Substitui o Google Trends, que devolve vazio para nomes pouco buscados.
import { getWikiMencoesFor } from "@/lib/sources/wikipedia-mentions";
import { seguidoresReaisTotais } from "@/lib/live-mock-v2";
import type { Watchlist } from "@/lib/watchlist";

export const INGREDIENTES = ["mencoes", "sentimento", "imprensa", "seguidores"] as const;
export type Ingrediente = (typeof INGREDIENTES)[number];

export type Celula = {
  valor: number | null;
  nota: number | null;
  fonte: "real" | "indisponivel";
};

export type Tendencia = "up" | "flat" | "down";

export type LinhaIndice = {
  simbolo: string;
  nome: string;
  cor: string;
  voce: boolean;
  ingredientes: Record<Ingrediente, Celula>;
  score: number | null; // nota composta 0–100 (= IRE; mantido por compat.)
  reputacao: number | null; // IRE = nota composta ponderada (0–100)
  posicao: number | null; // PRA = (IRE ÷ média(IRE) × 100) − 100, em %
  tendencia: Tendencia; // TIRE: tendência do IRE do candidato em 7 dias
  tendenciaDelta: number | null; // ΔIRE em 7 dias (numérico); null sem histórico
  tendenciaProvisoria: boolean; // true enquanto não há ~7d de histórico de IRE
  seguidores7dPct: number | null; // variação % de seguidores nos últimos 7 dias
  seguidores7dProvisorio: boolean; // true enquanto não há ~7d de histórico
};

export type TabelaIndice = {
  linhas: LinhaIndice[];
  mediaScore: number | null;
  pesos: Record<Ingrediente, number>;
  at: number;
  tendenciaAdversarios: Tendencia; // TPRA: média das tendências (ΔIRE 7d) dos concorrentes
  tendenciaAdversariosDelta: number | null;
  tendenciaAdversariosProvisoria: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const IRE_TREND_WINDOW_MS = 7 * DAY_MS;
const TENDENCIA_LIMIAR = 1.5;

/** Classifica uma variação numérica em direção de tendência (limiar ±1.5). */
function classifyDelta(delta: number | null): Tendencia {
  if (delta === null) return "flat";
  return delta > TENDENCIA_LIMIAR ? "up" : delta < -TENDENCIA_LIMIAR ? "down" : "flat";
}

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
      return getWikiMencoesFor(nome);
    case "sentimento":
      return getSentimentoRealFor(nome);
    case "imprensa":
      return getNewsImprensaFor(nome);
    case "seguidores":
      // Base total somada das redes; usada para gravar histórico e derivar o
      // crescimento % de 7 dias (que é o que de fato entra no índice).
      return seguidoresReaisTotais(w, simbolo);
  }
}

/** Crescimento semanal SINTÉTICO, determinístico por símbolo (~ −0,5% a +4%/sem).
 * Usado só no cold-start (<7d de histórico real) para o pilar Crescimento parecer
 * real e diferenciar candidatos até a janela de 7 dias completar. Retorna fração. */
function crescimentoSemanalMock(simbolo: string): number {
  let h = 0;
  for (let i = 0; i < simbolo.length; i++) h = (h * 31 + simbolo.charCodeAt(i)) >>> 0;
  return -0.005 + ((h % 1000) / 1000) * 0.045;
}

/** Nota 0–100 centrada em 50 vs. o páreo (z-score escalado). desvio 0 ⇒ 50. */
function notaZ(valor: number, valores: number[]): number {
  const n = valores.length;
  if (n === 0) return 50;
  const media = valores.reduce((a, b) => a + b, 0) / n;
  const variancia = valores.reduce((a, b) => a + (b - media) ** 2, 0) / n;
  const desvio = Math.sqrt(variancia);
  if (desvio === 0) return 50;
  return clamp(50 + 20 * ((valor - media) / desvio), 0, 100);
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

  // 1b) Crescimento da base: o pilar "seguidores" entra no índice como a VARIAÇÃO
  // % dos seguidores nos últimos 7 dias (não a base total). Grava o total real no
  // histórico e calcula o Δ7d ANTES das notas, para alimentar o z-score. Sem ~7d
  // de histórico, o crescimento fica null → célula indisponível (excluída +
  // renormalizada), e o índice roda sobre os outros pilares (cold-start honesto).
  const seg7d = candidatos.map((c, i) => {
    const total = brutos[i].seguidores;
    if (total === null) return { pct: null as number | null, provisorio: true };
    recordSeguidores(now, c.simbolo, total);
    const sa = seguidoresAt(c.simbolo, now - IRE_TREND_WINDOW_MS);
    // Janela REAL de 7 dias disponível → usa o histórico real.
    if (sa !== null && sa.v > 0 && now - sa.t >= IRE_TREND_WINDOW_MS) {
      return { pct: round1(((total - sa.v) / sa.v) * 100), provisorio: false };
    }
    // Cold-start (<7d de histórico real): base de "7 dias atrás" SIMULADA, coerente
    // e determinística por candidato (crescimento semanal ~ −0,5% a +4%). Mantém o
    // pilar Crescimento com cara real até a janela de 7 dias encher — aí o real assume.
    const g = crescimentoSemanalMock(c.simbolo);
    const base = total / (1 + g);
    return { pct: round1(((total - base) / base) * 100), provisorio: true };
  });
  // o valor do pilar "seguidores" passa a ser o crescimento %; a base total só
  // alimentou o histórico acima.
  brutos.forEach((b, i) => {
    b.seguidores = seg7d[i].pct;
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
      reputacao: score, // IRE = nota composta (absorve o antigo Score)
      posicao: null as number | null, // preenchido abaixo
      tendencia: "flat" as Tendencia,
      tendenciaDelta: null as number | null,
      tendenciaProvisoria: true,
      seguidores7dPct: seg7d[i].pct,
      seguidores7dProvisorio: seg7d[i].provisorio,
    };
  });

  // 4) PRA (100 = média) + TIRE (tendência do IRE em 7d) + Seguidores 7d
  const scores = linhas.map((l) => l.score).filter((s): s is number => s !== null);
  const mediaScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  for (const l of linhas) {
    if (l.score !== null && mediaScore && mediaScore > 0) {
      // PRA = (IRE ÷ média × 100) − 100, em % (0 = na média do páreo;
      // positivo = à frente dos adversários; negativo = atrás).
      l.posicao = round1((l.score / mediaScore) * 100 - 100);
      recordScore(now, l.simbolo, l.score);
    }

    // TIRE — tendência do IRE (reputação = nota composta) nos últimos 7 dias.
    if (l.reputacao !== null) {
      recordIre(now, l.simbolo, l.reputacao);
      const ant = ireAt(l.simbolo, now - IRE_TREND_WINDOW_MS);
      if (ant !== null) {
        l.tendenciaDelta = round1(l.reputacao - ant.v);
        l.tendencia = classifyDelta(l.tendenciaDelta);
        // Provisória enquanto a amostra de referência for mais nova que 7 dias.
        l.tendenciaProvisoria = now - ant.t < IRE_TREND_WINDOW_MS;
      }
    }
    // O crescimento da base (seguidores Δ7d) já foi calculado em `seg7d` e é o
    // próprio valor do pilar "seguidores" que entrou no IRE.
  }

  // TPRA — média das tendências (ΔIRE 7d) dos concorrentes (não inclui o principal).
  const deltasAdv = linhas
    .filter((l) => !l.voce && l.tendenciaDelta !== null)
    .map((l) => l.tendenciaDelta as number);
  const tendenciaAdversariosDelta = deltasAdv.length
    ? round1(deltasAdv.reduce((a, b) => a + b, 0) / deltasAdv.length)
    : null;
  const tendenciaAdversariosProvisoria =
    deltasAdv.length === 0 || linhas.some((l) => !l.voce && l.tendenciaProvisoria);

  return {
    linhas,
    mediaScore: mediaScore !== null ? round1(mediaScore) : null,
    pesos,
    at: now,
    tendenciaAdversarios: classifyDelta(tendenciaAdversariosDelta),
    tendenciaAdversariosDelta,
    tendenciaAdversariosProvisoria,
  };
}
