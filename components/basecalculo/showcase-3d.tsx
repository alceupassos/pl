"use client";

// Vitrine do /basecalculo: placar gigante (3 números + algoritmo em glow) e
// 6 gráficos 3D em 3 blocos de 2, cada bloco com um texto afirmando — de forma
// distinta — que a conta está certa. 3D no desktop (echarts-gl), fallback 2D no
// mobile/sem WebGL.

import { useMemo } from "react";

import { useIs3D } from "@/components/charts/use-is-3d";
import {
  contribuicao2D,
  contribuicao3D,
  matrizNotas2D,
  matrizNotas3D,
  paisagemScore3D,
  posicionamento2D,
  posicionamento3D,
  scoreVsPosicao,
  scoreVsPosicao2D,
  trajetoriaScore2D,
  trajetoriaScore3D,
  type Linha3D,
  type SeriesScore,
} from "@/components/charts/index-3d-options";
import { EChart } from "@/components/echart";

type Props = {
  linhas: Linha3D[];
  pesos: Record<string, number>;
  mediaScore: number | null;
  series: SeriesScore;
  now: number;
};

const TEND: Record<string, { sym: string; cor: string; label: string }> = {
  up: { sym: "▲", cor: "#16C784", label: "subindo" },
  flat: { sym: "▬", cor: "#8a93a8", label: "estável" },
  down: { sym: "▼", cor: "#EA3943", label: "caindo" },
};

function corRep(v: number | null): string {
  if (v == null) return "#8a93a8";
  if (v >= 60) return "#16C784";
  if (v >= 45) return "#F5A623";
  return "#EA3943";
}

function glow(cor: string): React.CSSProperties {
  return { textShadow: `0 0 12px ${cor}, 0 0 28px ${cor}aa` };
}

function PlacarNum({
  n,
  rotulo,
  valor,
  cor,
  formula,
  seta,
}: {
  n: number;
  rotulo: string;
  valor: string;
  cor: string;
  formula: string;
  seta?: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 220px",
        minWidth: 200,
        background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "18px 20px 16px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#5b6478" }}>
        {n} · {rotulo.toUpperCase()}
      </div>
      <div style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.05, color: cor, fontVariantNumeric: "tabular-nums", ...glow(cor) }}>
        {seta ? <span style={{ fontSize: 44 }}>{seta} </span> : null}
        {valor}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 12.5,
          fontFamily: "var(--m-font-mono, ui-monospace, monospace)",
          color: "#9fe7ff",
          ...glow("#22d3ee"),
        }}
      >
        {formula}
      </div>
    </div>
  );
}

function Chart({ titulo, opt, use3D }: { titulo: string; opt: Record<string, unknown>; use3D: boolean }) {
  return (
    <div style={{ flex: "1 1 380px", minWidth: 300 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#c8d0e0", marginBottom: 4 }}>{titulo}</div>
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
        <EChart option={opt} use3D={use3D} height={340} />
      </div>
    </div>
  );
}

function Bloco({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#e8ecf4", margin: "0 0 4px" }}>{titulo}</h2>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: "#9aa3b8", margin: "0 0 12px", maxWidth: 920 }}>{texto}</p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>{children}</div>
    </section>
  );
}

export function Showcase3D({ linhas, pesos, mediaScore, series, now }: Props) {
  const is3D = useIs3D();
  const voce = linhas.find((l) => l.voce) ?? linhas[0] ?? null;

  const charts = useMemo(() => {
    const pick = (a: Record<string, unknown>, b: Record<string, unknown>) => (is3D ? a : b);
    return {
      matriz: pick(matrizNotas3D(linhas), matrizNotas2D(linhas)),
      posic: pick(posicionamento3D(linhas), posicionamento2D(linhas)),
      traj: pick(trajetoriaScore3D(linhas, series, now), trajetoriaScore2D(linhas, series, now)),
      paisagem: pick(paisagemScore3D(linhas, series, now), trajetoriaScore2D(linhas, series, now)),
      contrib: pick(contribuicao3D(linhas, pesos), contribuicao2D(linhas, pesos)),
      scoreVsPos: pick(scoreVsPosicao(linhas), scoreVsPosicao2D(linhas)),
    };
  }, [linhas, pesos, series, now, is3D]);

  const tend = TEND[voce?.tendencia ?? "flat"];
  const posCor = voce?.posicao == null ? "#8a93a8" : voce.posicao >= 100 ? "#16C784" : "#EA3943";

  return (
    <div>
      {/* ── PLACAR GIGANTE ── */}
      {voce ? (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <PlacarNum
            n={1}
            rotulo="Reputação"
            valor={voce.reputacao == null ? "—" : String(Math.round(voce.reputacao))}
            cor={corRep(voce.reputacao)}
            formula="nota = 50 + 15·(s − μ)/σ"
          />
          <PlacarNum
            n={2}
            rotulo="Posição vs. adversários"
            valor={voce.posicao == null ? "—" : String(Math.round(voce.posicao))}
            cor={posCor}
            formula="Score ÷ média × 100"
          />
          <PlacarNum
            n={3}
            rotulo="Tendência"
            valor={tend.label}
            seta={tend.sym}
            cor={tend.cor}
            formula="sinal(Score₍agora₎ − Score₍24h₎)"
          />
        </div>
      ) : null}

      <p style={{ fontSize: 11.5, color: "#5b6478", marginTop: 8, textAlign: "center" }}>
        {voce?.nome ?? "—"} · média do páreo (Score) ={" "}
        {mediaScore == null ? "—" : mediaScore.toFixed(1)} ·{" "}
        {is3D ? "gráficos em 3D (gire com o mouse)" : "versão 2D (tela estreita / sem WebGL)"}
      </p>

      {/* ── BLOCO 1 ── */}
      <Bloco
        titulo="Os pilares estão na mesma régua"
        texto={
          <>
            Antes de comparar candidatos, cada sinal — menções, sentimento, imprensa e seguidores —
            é convertido para uma <strong>nota de 0 a 100 pela mesma fórmula estatística</strong>{" "}
            (z-score centrado em 50). Isso elimina o problema de somar &quot;maçã com laranja&quot;.
            A <strong>matriz 3D</strong> mostra cada pilar na mesma escala de altura; a{" "}
            <strong>nuvem de pontos</strong> posiciona cada candidato no espaço dos pilares. Se a
            normalização estivesse errada, os eixos não fechariam em 0–100 — e fecham.
          </>
        }
      >
        <Chart titulo="Matriz de notas · candidatos × pilares (bar3D)" opt={charts.matriz} use3D={is3D} />
        <Chart titulo="Posicionamento multidimensional (scatter3D)" opt={charts.posic} use3D={is3D} />
      </Bloco>

      {/* ── BLOCO 2 ── */}
      <Bloco
        titulo="A história confere com a tendência"
        texto={
          <>
            A Tendência não é palpite. Ela compara o <strong>Score de agora com o de ~24h atrás</strong>,
            lido do histórico real que o próprio sistema grava em disco a cada poucos minutos. A{" "}
            <strong>linha 3D no tempo</strong> desenha a trajetória de cada candidato e a{" "}
            <strong>superfície</strong> ao lado é a &quot;paisagem&quot; do páreo: onde a curva sobe,
            a seta sobe — porque é exatamente a mesma fonte alimentando os dois.
          </>
        }
      >
        <Chart titulo="Trajetória do Score no tempo (line3D)" opt={charts.traj} use3D={is3D} />
        <Chart titulo="Paisagem do Score · tempo × candidato (surface)" opt={charts.paisagem} use3D={is3D} />
      </Bloco>

      {/* ── BLOCO 3 ── */}
      <Bloco
        titulo="A conta fecha — sem caixa-preta"
        texto={
          <>
            Passo a passo: o <strong>Score</strong> é a soma das notas multiplicadas pelos pesos
            (35% menções · 30% sentimento · 15% imprensa · 20% seguidores), e a{" "}
            <strong>Posição</strong> é só o Score dividido pela média do páreo × 100. As{" "}
            <strong>barras empilhadas</strong> mostram cada pilar contribuindo para o Score; a{" "}
            <strong>dispersão Score×Posição</strong> cai exatamente sobre a reta{" "}
            <em>y = x/média×100</em>. O que está na planilha abaixo é o que os gráficos desenham.
          </>
        }
      >
        <Chart titulo="Anatomia do Score · contribuição nota×peso (bar3D empilhado)" opt={charts.contrib} use3D={is3D} />
        <Chart titulo="Score × Posição · relação linear (scatterGL)" opt={charts.scoreVsPos} use3D={is3D} />
      </Bloco>
    </div>
  );
}
