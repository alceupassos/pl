"use client";

// Vitrine do /basecalculo em REMOTION: placar (3 números + algoritmo em glow) e
// 6 cards animados com efeito 3D em 3 blocos de 2, cada bloco com um texto
// afirmando — de forma distinta — que a conta está certa. Cada card é uma
// composition Remotion tocada via <Player> (play-on-view).

import { useMemo, type ComponentType } from "react";

import { RemotionCard } from "@/components/basecalculo/remotion-card";
import { type Linha3D, type SeriesScore } from "@/components/charts/index-3d-options";
import {
  PilaresRemotion,
  PlacarRemotion,
  ScatterRemotion,
  TrajetoriaRemotion,
  type CandViz,
  type SerieViz,
} from "@/remotion/basecalculo/index-cards";

type Props = {
  linhas: Linha3D[];
  pesos: Record<string, number>;
  mediaScore: number | null;
  series: SeriesScore;
  now: number;
};

const ING = ["mencoes", "sentimento", "imprensa", "seguidores"] as const;

// Casts os componentes Remotion para o tipo aceito pelo RemotionCard.
const comp = (c: unknown) => c as ComponentType<Record<string, unknown>>;

function Bloco({ titulo, texto, children }: { titulo: string; texto: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#e8ecf4", margin: "0 0 4px" }}>{titulo}</h2>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: "#9aa3b8", margin: "0 0 12px", maxWidth: 920 }}>{texto}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>{children}</div>
    </section>
  );
}

export function Showcase3D({ linhas, pesos, mediaScore, series }: Props) {
  const voce = linhas.find((l) => l.voce) ?? linhas[0] ?? null;

  const candidatos: CandViz[] = useMemo(
    () =>
      linhas.map((l) => ({
        simbolo: l.simbolo,
        nome: l.nome,
        cor: l.cor,
        notas: ING.map((k) => l.ingredientes[k]?.nota ?? 0),
        score: l.score,
        posicao: l.posicao,
        reputacao: l.reputacao,
      })),
    [linhas],
  );

  const seriesViz: SerieViz[] = useMemo(
    () =>
      linhas.map((l) => {
        const pts = (series[l.simbolo] ?? []).map((p) => p.v);
        return { simbolo: l.simbolo, cor: l.cor, pts: pts.length >= 2 ? pts : [l.score ?? 100, l.score ?? 100] };
      }),
    [linhas, series],
  );

  const pesosArr = ING.map((k) => pesos[k] ?? 0);

  return (
    <div>
      {/* ── PLACAR (Remotion) ── */}
      {voce ? (
        <RemotionCard
          component={comp(PlacarRemotion)}
          inputProps={{ reputacao: voce.reputacao, posicao: voce.posicao, tendencia: voce.tendencia, nome: voce.nome }}
          compW={980}
          compH={260}
        />
      ) : null}
      <p style={{ fontSize: 11.5, color: "#5b6478", marginTop: 8, textAlign: "center" }}>
        média do páreo (Score) = {mediaScore == null ? "—" : mediaScore.toFixed(1)} · animações em Remotion (efeito 3D)
      </p>

      {/* ── BLOCO 1 ── */}
      <Bloco
        titulo="Os pilares estão na mesma régua"
        texto={
          <>
            Antes de comparar candidatos, cada sinal — menções, sentimento, imprensa e seguidores — é
            convertido para uma <strong>nota de 0 a 100 pela mesma fórmula estatística</strong>{" "}
            (z-score centrado em 50). As barras crescem na mesma escala e a nuvem posiciona cada
            candidato no espaço dos pilares: se a normalização estivesse errada, nada fecharia em 0–100.
          </>
        }
      >
        <RemotionCard component={comp(PilaresRemotion)} inputProps={{ candidatos, modo: "nota", pesos: pesosArr }} compW={640} compH={380} />
        <RemotionCard component={comp(ScatterRemotion)} inputProps={{ candidatos, modo: "posicionamento" }} compW={640} compH={380} />
      </Bloco>

      {/* ── BLOCO 2 ── */}
      <Bloco
        titulo="A história confere com a tendência"
        texto={
          <>
            A Tendência não é palpite: compara o <strong>Score de agora com o de ~24h atrás</strong>,
            lido do histórico real que o sistema grava sozinho. As linhas desenham a trajetória de cada
            candidato e a paisagem mostra o relevo do páreo — onde a curva sobe, a seta sobe.
          </>
        }
      >
        <RemotionCard component={comp(TrajetoriaRemotion)} inputProps={{ series: seriesViz, modo: "linha" }} compW={640} compH={380} />
        <RemotionCard component={comp(TrajetoriaRemotion)} inputProps={{ series: seriesViz, modo: "paisagem" }} compW={640} compH={380} />
      </Bloco>

      {/* ── BLOCO 3 ── */}
      <Bloco
        titulo="A conta fecha — sem caixa-preta"
        texto={
          <>
            Passo a passo: o <strong>Score</strong> é a soma das notas multiplicadas pelos pesos (35/30/15/20)
            e a <strong>Posição</strong> é o Score dividido pela média do páreo × 100. As barras mostram cada
            pilar contribuindo para o Score; a dispersão Score×Posição cai sobre a reta esperada.
          </>
        }
      >
        <RemotionCard component={comp(PilaresRemotion)} inputProps={{ candidatos, modo: "contrib", pesos: pesosArr }} compW={640} compH={380} />
        <RemotionCard component={comp(ScatterRemotion)} inputProps={{ candidatos, modo: "scorepos" }} compW={640} compH={380} />
      </Bloco>
    </div>
  );
}
