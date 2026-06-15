"use client";

// Vitrine do /basecalculo com RECHARTS (SVG animado, leve e confiável).
// Placar (3 números + algoritmo em glow) + 6 gráficos em 3 blocos de 2, cada
// bloco com um texto distinto afirmando que a conta está certa.

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { type Linha3D, type SeriesScore } from "@/components/charts/index-3d-options";

type Props = {
  linhas: Linha3D[];
  pesos: Record<string, number>;
  mediaScore: number | null;
  series: SeriesScore;
};

const ING = ["mencoes", "sentimento", "imprensa", "seguidores"] as const;
const PILAR = [
  { key: "Menções", cor: "#3b82f6" },
  { key: "Sentimento", cor: "#22c55e" },
  { key: "Imprensa", cor: "#f0c030" },
  { key: "Seguidores", cor: "#a855f7" },
];
const AXIS = "rgba(255,255,255,0.18)";
const GRID = "rgba(255,255,255,0.06)";
const TICK = { fill: "#8a93a8", fontSize: 11 };
const TOOLTIP = {
  contentStyle: { background: "rgba(16,16,24,0.96)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 },
  labelStyle: { color: "#e6e6f0" },
  itemStyle: { color: "#e6e6f0" },
};

function corRep(v: number | null): string {
  if (v == null) return "#8a93a8";
  if (v >= 60) return "#16C784";
  if (v >= 45) return "#F5A623";
  return "#EA3943";
}
const TEND: Record<string, { sym: string; cor: string; label: string }> = {
  up: { sym: "▲", cor: "#16C784", label: "subindo" },
  flat: { sym: "▬", cor: "#8a93a8", label: "estável" },
  down: { sym: "▼", cor: "#EA3943", label: "caindo" },
};

function PlacarNum({ n, rotulo, valor, cor, formula }: { n: number; rotulo: string; valor: string; cor: string; formula: string }) {
  return (
    <div style={{ flex: "1 1 220px", minWidth: 200, background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "18px 20px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#5b6478" }}>{n} · {rotulo.toUpperCase()}</div>
      <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05, color: cor, fontVariantNumeric: "tabular-nums", textShadow: `0 0 12px ${cor}, 0 0 30px ${cor}aa` }}>{valor}</div>
      <div style={{ marginTop: 6, fontSize: 12.5, fontFamily: "ui-monospace, monospace", color: "#9fe7ff", textShadow: "0 0 12px #22d3ee" }}>{formula}</div>
    </div>
  );
}

function Bloco({ titulo, texto, children }: { titulo: string; texto: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#e8ecf4", margin: "0 0 4px" }}>{titulo}</h2>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: "#9aa3b8", margin: "0 0 12px", maxWidth: 920 }}>{texto}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>{children}</div>
    </section>
  );
}

function ChartCard({ titulo, children }: { titulo: string; children: React.ReactElement }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 8px 8px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#c8d0e0", margin: "0 6px 6px" }}>{titulo}</div>
      <ResponsiveContainer width="100%" height={300}>{children}</ResponsiveContainer>
    </div>
  );
}

export function Showcase3D({ linhas, pesos, mediaScore, series }: Props) {
  const voce = linhas.find((l) => l.voce) ?? linhas[0] ?? null;

  // dados por candidato
  const notasData = useMemo(
    () =>
      linhas.map((l) => ({
        simbolo: l.simbolo,
        Menções: l.ingredientes.mencoes?.nota ?? 0,
        Sentimento: l.ingredientes.sentimento?.nota ?? 0,
        Imprensa: l.ingredientes.imprensa?.nota ?? 0,
        Seguidores: l.ingredientes.seguidores?.nota ?? 0,
      })),
    [linhas],
  );

  const contribData = useMemo(
    () =>
      linhas.map((l) => ({
        simbolo: l.simbolo,
        Menções: Math.round((l.ingredientes.mencoes?.nota ?? 0) * (pesos.mencoes ?? 0) * 10) / 10,
        Sentimento: Math.round((l.ingredientes.sentimento?.nota ?? 0) * (pesos.sentimento ?? 0) * 10) / 10,
        Imprensa: Math.round((l.ingredientes.imprensa?.nota ?? 0) * (pesos.imprensa ?? 0) * 10) / 10,
        Seguidores: Math.round((l.ingredientes.seguidores?.nota ?? 0) * (pesos.seguidores ?? 0) * 10) / 10,
      })),
    [linhas, pesos],
  );

  const posData = useMemo(
    () =>
      linhas.map((l) => ({
        simbolo: l.simbolo,
        cor: l.cor,
        x: l.ingredientes.mencoes?.nota ?? 0,
        y: l.ingredientes.sentimento?.nota ?? 0,
        z: l.ingredientes.seguidores?.nota ?? 10,
      })),
    [linhas],
  );

  const scorePosData = useMemo(
    () => linhas.filter((l) => l.score != null && l.posicao != null).map((l) => ({ simbolo: l.simbolo, cor: l.cor, x: l.score as number, y: l.posicao as number })),
    [linhas],
  );

  const trajData = useMemo(() => {
    const maxLen = Math.max(0, ...linhas.map((l) => (series[l.simbolo] ?? []).length));
    if (maxLen < 2) {
      // sem histórico ainda: dois pontos planos no Score
      return [0, 1].map((t) => {
        const row: Record<string, number> = { t };
        linhas.forEach((l) => (row[l.simbolo] = l.score ?? 100));
        return row;
      });
    }
    return Array.from({ length: maxLen }, (_, i) => {
      const row: Record<string, number> = { t: i };
      linhas.forEach((l) => {
        const pts = series[l.simbolo] ?? [];
        row[l.simbolo] = pts[i]?.v ?? pts[pts.length - 1]?.v ?? l.score ?? 100;
      });
      return row;
    });
  }, [linhas, series]);

  const tend = TEND[voce?.tendencia ?? "flat"];
  const posCor = voce?.posicao == null ? "#8a93a8" : voce.posicao >= 100 ? "#16C784" : "#EA3943";

  return (
    <div>
      {/* PLACAR */}
      {voce ? (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <PlacarNum n={1} rotulo="Reputação" valor={voce.reputacao == null ? "—" : String(Math.round(voce.reputacao))} cor={corRep(voce.reputacao)} formula="nota = 50 + 15·(s − μ)/σ" />
          <PlacarNum n={2} rotulo="Posição vs. adversários" valor={voce.posicao == null ? "—" : String(Math.round(voce.posicao))} cor={posCor} formula="Score ÷ média × 100" />
          <PlacarNum n={3} rotulo="Tendência" valor={`${tend.sym} ${tend.label}`} cor={tend.cor} formula="sinal(Score₍agora₎ − Score₍24h₎)" />
        </div>
      ) : null}
      <p style={{ fontSize: 11.5, color: "#5b6478", marginTop: 8, textAlign: "center" }}>
        {voce?.nome ?? "—"} · média do páreo (Score) = {mediaScore == null ? "—" : mediaScore.toFixed(1)}
      </p>

      {/* BLOCO 1 */}
      <Bloco
        titulo="Os pilares estão na mesma régua"
        texto={<>Antes de comparar, cada sinal vira uma <strong>nota de 0 a 100 pela mesma fórmula</strong> (z-score centrado em 50). As barras ficam na mesma escala e a dispersão posiciona cada candidato — se a normalização estivesse errada, nada caberia em 0–100.</>}
      >
        <ChartCard titulo="Notas por pilar · candidatos">
          <BarChart data={notasData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} />
            <XAxis dataKey="simbolo" tick={TICK} stroke={AXIS} />
            <YAxis domain={[0, 100]} tick={TICK} stroke={AXIS} />
            <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {PILAR.map((p) => (
              <Bar key={p.key} dataKey={p.key} fill={p.cor} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ChartCard>
        <ChartCard titulo="Posicionamento · menções × sentimento (bolha = seguidores)">
          <ScatterChart margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} />
            <XAxis type="number" dataKey="x" name="Menções" domain={[0, 100]} tick={TICK} stroke={AXIS} />
            <YAxis type="number" dataKey="y" name="Sentimento" domain={[0, 100]} tick={TICK} stroke={AXIS} />
            <ZAxis type="number" dataKey="z" range={[80, 500]} />
            <Tooltip {...TOOLTIP} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={posData}>
              {posData.map((d) => (
                <Cell key={d.simbolo} fill={d.cor} />
              ))}
            </Scatter>
          </ScatterChart>
        </ChartCard>
      </Bloco>

      {/* BLOCO 2 */}
      <Bloco
        titulo="A história confere com a tendência"
        texto={<>A Tendência compara o <strong>Score de agora com o de ~24h atrás</strong>, do histórico real gravado pelo sistema. As linhas mostram a trajetória de cada candidato; a área, o relevo do páreo.</>}
      >
        <ChartCard titulo="Trajetória do Score · tempo">
          <LineChart data={trajData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} />
            <XAxis dataKey="t" tick={TICK} stroke={AXIS} />
            <YAxis tick={TICK} stroke={AXIS} domain={["auto", "auto"]} />
            <Tooltip {...TOOLTIP} />
            {linhas.map((l) => (
              <Line key={l.simbolo} type="monotone" dataKey={l.simbolo} stroke={l.cor} dot={false} strokeWidth={2} isAnimationActive />
            ))}
          </LineChart>
        </ChartCard>
        <ChartCard titulo="Paisagem do Score (áreas sobrepostas)">
          <AreaChart data={trajData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} />
            <XAxis dataKey="t" tick={TICK} stroke={AXIS} />
            <YAxis tick={TICK} stroke={AXIS} domain={["auto", "auto"]} />
            <Tooltip {...TOOLTIP} />
            {linhas.map((l) => (
              <Area key={l.simbolo} type="monotone" dataKey={l.simbolo} stroke={l.cor} fill={l.cor} fillOpacity={0.15} strokeWidth={1.5} />
            ))}
          </AreaChart>
        </ChartCard>
      </Bloco>

      {/* BLOCO 3 */}
      <Bloco
        titulo="A conta fecha — sem caixa-preta"
        texto={<>O <strong>Score</strong> é a soma das notas × pesos (35/30/15/20) e a <strong>Posição</strong> é o Score ÷ média × 100. As barras empilhadas mostram cada pilar somando ao Score; a dispersão Score×Posição cai sobre a reta esperada (linha da média em 100).</>}
      >
        <ChartCard titulo="Anatomia do Score · contribuição nota×peso (empilhada)">
          <BarChart data={contribData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} />
            <XAxis dataKey="simbolo" tick={TICK} stroke={AXIS} />
            <YAxis tick={TICK} stroke={AXIS} />
            <Tooltip {...TOOLTIP} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {PILAR.map((p) => (
              <Bar key={p.key} dataKey={p.key} stackId="score" fill={p.cor} />
            ))}
          </BarChart>
        </ChartCard>
        <ChartCard titulo="Score × Posição · relação linear">
          <ScatterChart margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} />
            <XAxis type="number" dataKey="x" name="Score" domain={["auto", "auto"]} tick={TICK} stroke={AXIS} />
            <YAxis type="number" dataKey="y" name="Posição" domain={["auto", "auto"]} tick={TICK} stroke={AXIS} />
            <Tooltip {...TOOLTIP} cursor={{ strokeDasharray: "3 3" }} />
            <ReferenceLine y={100} stroke="rgba(34,211,238,0.5)" strokeDasharray="4 4" label={{ value: "média (100)", fill: "#67e8f9", fontSize: 10 }} />
            <Scatter data={scorePosData}>
              {scorePosData.map((d) => (
                <Cell key={d.simbolo} fill={d.cor} />
              ))}
            </Scatter>
          </ScatterChart>
        </ChartCard>
      </Bloco>
    </div>
  );
}
