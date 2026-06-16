"use client";

// SOST-IDX — card que VIRA em 3D ao tocar. Front: número-manchete + candlestick
// + os 4 componentes (com tooltips). Verso: explicação do índice em linguagem
// de leigo FUNDIDA com o placar da campanha (eleitores cadastrados, quantos
// faltam, dentro/fora da meta) e a projeção realista de cadastro até a eleição
// de outubro/2026. Índice e meta no mesmo card.

import Link from "next/link";
import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { candlestickOption } from "@/components/mobile/m-chart-options";
import { Bars3D, Gauge3D, SparkDepth } from "@/components/mobile/ui/fx3d";
import { ExpandFlipCard } from "@/components/mobile/ui/expand-flip-card";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LeituraIA } from "@/components/mobile/ui/leitura-ia";
import { InfoTip } from "@/components/mobile/ui/info-tip";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import type { EquipeSnapshot, IdxSnapshot } from "@/lib/live-schemas";
import { FONTE_COMO } from "@/lib/mobile/fonte-meta";
import { META_ELEITORES, previstoPara } from "@/lib/mock/campaign-goal";
import type { Watchlist } from "@/lib/watchlist";

// 1º turno das eleições 2026 (referência fixa para a projeção de cadastro).
const ELEICAO_MS = new Date("2026-10-04T00:00:00-03:00").getTime();
const DIA_MS = 24 * 60 * 60 * 1000;

function fmtCompact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(".", ",")}k`;
  }
  return n.toLocaleString("pt-BR");
}

/* ── mini-gráfico de meta: anel de progresso no canto superior direito ── */
function MetaRing({
  alcancado,
  meta,
  noRitmo,
}: {
  alcancado: number;
  meta: number;
  noRitmo: boolean;
}) {
  const pct = Math.min(100, (alcancado / Math.max(1, meta)) * 100);
  const r = 16;
  const circ = 2 * Math.PI * r;
  const cor = noRitmo ? "#16C784" : "#F5A623";
  return (
    <span
      style={{
        marginLeft: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
      }}
    >
      <svg
        width={42}
        height={42}
        viewBox="0 0 42 42"
        role="img"
        aria-label={`Meta de eleitores: ${pct.toFixed(0)}% alcançada`}
      >
        <circle
          cx={21}
          cy={21}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={4}
        />
        <circle
          cx={21}
          cy={21}
          r={r}
          fill="none"
          stroke={cor}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * circ} ${circ}`}
          transform="rotate(-90 21 21)"
        />
        <text
          x={21}
          y={25}
          textAnchor="middle"
          fontSize={10.5}
          fontWeight={800}
          fill={cor}
        >
          {pct.toFixed(0)}%
        </text>
      </svg>
      <span
        className="m-mono"
        style={{ fontSize: 7.5, color: "var(--m-muted)", whiteSpace: "nowrap" }}
      >
        {fmtCompact(alcancado)} / meta {fmtCompact(meta)}
      </span>
    </span>
  );
}

// Cada componente do índice + a explicação do que move aquele número, a fonte e
// se é dado real ou modelado. `curto` é a mini-legenda do verso.
const PARTES: {
  key: keyof IdxSnapshot["breakdown"];
  label: string;
  curto: string;
  explica: (valor: number, pesoPct: number) => string;
}[] = [
  {
    key: "mencoes",
    label: "menções",
    curto: "quanto falam dele nas redes",
    explica: (v, p) =>
      `Buzz de busca (peso ${p}% do índice). Valor ${v}. Quando disponível, vem do Google Trends via sidecar; senão, série modelada.`,
  },
  {
    key: "sentimento",
    label: "sentimento",
    curto: "se falam bem ou mal",
    explica: (v, p) =>
      `Tom das manchetes reais sobre o candidato, classificado por IA em português (pysentimiento), positivo vs negativo (maior peso do IRE, ${p}%). Valor ${v}; acima de 100 = clima mais favorável.`,
  },
  {
    key: "seguidores",
    label: "crescimento",
    curto: "base crescendo · Δ7 dias",
    explica: (v, p) =>
      `Crescimento da base: variação % dos seguidores somados das redes nos últimos 7 dias (peso ${p}% do IRE), real via Bright Data/yt-dlp. Nota atual ${v}; acima de 50 = base crescendo mais que o páreo. Sem 7 dias de histórico, fica "acumulando".`,
  },
  {
    key: "imprensa",
    label: "imprensa",
    curto: "presença no jornal",
    explica: (v, p) =>
      `Cobertura de imprensa REAL via Google News (peso ${p}%). Valor ${v}: ritmo de matérias dos últimos dias vs o normal do candidato — acima de 100 = em alta na imprensa.`,
  },
];

function idxTemReal(idx: IdxSnapshot): boolean {
  if (!idx.fontes) return false;
  return Object.values(idx.fontes).some((f) => f === "real");
}

/* ── Métricas do índice: IRE · TIRE · PRA · TPRA ── */
function corReputacao(v: number | null): string {
  if (v == null) return "var(--m-muted)";
  if (v >= 60) return "#16C784";
  if (v >= 45) return "#F5A623";
  return "#EA3943";
}

// PRA = 100 − (Score ÷ média × 100), em %. 0 = na média do páreo; negativo = à
// frente dos adversários (verde); positivo = atrás (vermelho).
function corPra(v: number | null): string {
  if (v == null) return "var(--m-muted)";
  if (v < -0.05) return "#16C784";
  if (v > 0.05) return "#EA3943";
  return "#8a93a8";
}

const TEND = {
  up: { sym: "▲", cor: "#16C784", label: "subindo" },
  flat: { sym: "▬", cor: "#8a93a8", label: "estável" },
  down: { sym: "▼", cor: "#EA3943", label: "caindo" },
} as const;

function fmtSigned(v: number, suffix = ""): string {
  const sinal = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sinal}${Math.abs(v).toFixed(1).replace(".", ",")}${suffix}`;
}

// Tendência inline (seta + Δ + janela). `provisorio` ⇒ ainda acumulando 7 dias.
function TrendInline({
  dir,
  delta,
  provisorio,
}: {
  dir: "up" | "flat" | "down";
  delta: number | null;
  provisorio?: boolean;
}) {
  const t = TEND[dir];
  return (
    <span
      className="m-mono"
      style={{ color: t.cor, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}
    >
      {t.sym} {delta == null ? "—" : fmtSigned(delta)}
      <span style={{ color: "var(--m-muted)", fontWeight: 600 }}>
        {" "}
        · {provisorio ? "acumulando" : "7d"}
      </span>
    </span>
  );
}

// Uma linha "tipo cotação": sigla + valor grande + tendência (Δ 7 dias).
function MetricLine({
  sigla,
  tituloTend,
  valor,
  valorCor,
  trend,
  compact,
}: {
  sigla: string;
  tituloTend: string;
  valor: React.ReactNode;
  valorCor: string;
  trend: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap", minWidth: 0 }}>
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.07em", color: "var(--m-muted)", width: 34 }}>
        {sigla}
      </span>
      <span
        className="m-mono"
        style={{ fontSize: compact ? 22 : 28, fontWeight: 800, lineHeight: 1, color: valorCor }}
      >
        {valor}
      </span>
      <span title={tituloTend}>{trend}</span>
    </div>
  );
}

// As 4 métricas em duas linhas: IRE+TIRE e PRA+TPRA (estilo cotação de bolsa).
function Metricas4({ idx, compact }: { idx: IdxSnapshot; compact?: boolean }) {
  const ire = idx.reputacao ?? null;
  const pra = idx.posicao ?? null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 7 : 10, minWidth: 0 }}>
      <MetricLine
        sigla="IRE"
        tituloTend="TIRE · tendência do IRE do candidato em 7 dias"
        valorCor={corReputacao(ire)}
        valor={ire == null ? "—" : <Odometer value={ire} decimals={0} />}
        trend={
          <TrendInline
            dir={idx.tendencia ?? "flat"}
            delta={idx.tendenciaDelta ?? null}
            provisorio={idx.tendenciaProvisoria}
          />
        }
        compact={compact}
      />
      <MetricLine
        sigla="PRA"
        tituloTend="TPRA · média da tendência (ΔIRE 7 dias) dos adversários"
        valorCor={corPra(pra)}
        valor={pra == null ? "—" : fmtSigned(pra, "%")}
        trend={
          <TrendInline
            dir={idx.tendenciaAdversarios ?? "flat"}
            delta={idx.tendenciaAdversariosDelta ?? null}
            provisorio={idx.tendenciaAdversariosProvisoria}
          />
        }
        compact={compact}
      />
    </div>
  );
}

// Mini-candle dos últimos 7 dias do índice (reusa os candles diários reais).
function MiniCandle7d({ idx, height = 70 }: { idx: IdxSnapshot; height?: number }) {
  const opt = useMemo(
    () =>
      candlestickOption({
        candles: [...idx.candles30d.slice(-7), idx.candleVivo],
        compact: true,
        refLine: null,
      }),
    [idx],
  );
  return (
    <div data-no-swipe onClick={(e) => e.stopPropagation()} style={{ width: "100%" }}>
      <EChart option={opt} height={height} />
    </div>
  );
}

function MetaPills({ alcancado }: { alcancado: number }) {
  return (
    <div className="m-meta-pills">
      <span className="m-pill meta-goal">
        meta {fmtCompact(META_ELEITORES)}
      </span>
      <span className="m-pill meta-goal">
        alcançado {fmtCompact(alcancado)}
      </span>
    </div>
  );
}

/* ── dados para as mini-visualizações 3D (fx3d) ── */
const PILAR_COR: Record<keyof IdxSnapshot["breakdown"], string> = {
  mencoes: "#3b82f6",
  sentimento: "#22c55e",
  imprensa: "#f0c030",
  seguidores: "#a855f7",
};
function barsFromIdx(idx: IdxSnapshot) {
  return PARTES.map((p) => ({
    label: p.label,
    nota: idx.ingredientes?.[p.key]?.nota ?? null,
    cor: PILAR_COR[p.key],
  }));
}
function closesFromIdx(idx: IdxSnapshot): number[] {
  return [...idx.candles30d, idx.candleVivo].map((c) => c.c);
}

function IdxCompact({
  idx,
  watchlist,
  equipe,
}: {
  idx: IdxSnapshot;
  watchlist: Watchlist | null;
  equipe: EquipeSnapshot | null;
}) {
  const cadastrados = equipe?.geral.cadastrados ?? 0;

  return (
    <FlashCard watch={idx.reputacao ?? idx.valor} className="m-card-compact">
      <div className="m-card-head m-card-head-ticker">
        <span className="m-card-title">
          {watchlist?.principal.simbolo ?? "SOST"}-IDX · índice do candidato
        </span>
        <MetaPills alcancado={cadastrados} />
        <div className="m-card-head-badges" style={{ width: "100%" }}>
          <LeituraIA
            card="ticker-sost-idx"
            contexto={`valor ${idx.valor.toFixed(2)}; var dia ${idx.variacaoDia.toFixed(1)}%; cad ${cadastrados}/${META_ELEITORES}`}
            titulo="SOST-IDX"
          />
          <FonteBadge real={idxTemReal(idx)} como={FONTE_COMO.idxComposto} />
          <LiveBadge ch="idx.sost" cadenceMs={2000} />
        </div>
      </div>

      <div className="m-compact-row">
        <div className="m-compact-main">
          <Metricas4 idx={idx} compact />
        </div>
        <div
          className="m-compact-chart"
          data-no-swipe
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <MiniCandle7d idx={idx} height={72} />
        </div>
      </div>
    </FlashCard>
  );
}

/* ── FRENTE expandida — o índice de hoje ── */
function IdxFront({
  idx,
  watchlist,
  equipe,
  agora,
}: {
  idx: IdxSnapshot;
  watchlist: Watchlist | null;
  equipe: EquipeSnapshot | null;
  agora: number;
}) {
  const cadastrados = equipe?.geral.cadastrados ?? 0;
  // "no ritmo" = cadastros de hoje >= onde a curva linear até out/2026 manda estar.
  const noRitmo =
    cadastrados >= previstoPara(agora > 0 ? agora : ELEICAO_MS - 120 * DIA_MS);
  return (
    <FlashCard watch={idx.valor}>
      <div className="m-card-head">
        <span className="m-card-title">
          {watchlist?.principal.simbolo ?? "SOST"}-IDX · índice do candidato
        </span>
        <LeituraIA
          card="ticker-sost-idx"
          contexto={`valor ${idx.valor.toFixed(2)}; var dia ${idx.variacaoDia.toFixed(1)}%; imp ${idx.breakdown.imprensa.toFixed(0)} sent ${idx.breakdown.sentimento.toFixed(0)} seg ${idx.breakdown.seguidores.toFixed(0)} men ${idx.breakdown.mencoes.toFixed(0)}; cad ${cadastrados}/${META_ELEITORES}`}
          titulo="SOST-IDX"
        />
        <FonteBadge real={idxTemReal(idx)} como={FONTE_COMO.idxComposto} />
        <LiveBadge ch="idx.sost" cadenceMs={2000} />
        <MetaRing
          alcancado={cadastrados}
          meta={META_ELEITORES}
          noRitmo={noRitmo}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "2px 0" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Metricas4 idx={idx} />
        </div>
        <Gauge3D
          valor={idx.reputacao ?? null}
          label="IRE"
          cor={corReputacao(idx.reputacao ?? null)}
          size={84}
        />
      </div>

      <div
        className="m-mono"
        style={{ fontSize: 10.5, color: "#9fe7ff", textAlign: "center", margin: "0 0 4px" }}
      >
        IRE = 0,40·Sent + 0,25·Menç + 0,20·Impr + 0,15·Cresc
      </div>

      <div data-no-swipe onClick={(e) => e.stopPropagation()} style={{ margin: "8px 0 2px" }}>
        <div className="m-muted-c" style={{ fontSize: 10, marginBottom: 2 }}>
          índice · últimos 7 dias (candle)
        </div>
        <MiniCandle7d idx={idx} height={120} />
      </div>

      {idx.seguidores7dPct != null ? (
        <div className="m-muted-c" style={{ fontSize: 10.5, margin: "6px 0 0" }}>
          seguidores · últimos 7 dias:{" "}
          <strong style={{ color: idx.seguidores7dPct >= 0 ? "#16C784" : "#EA3943" }}>
            {fmtSigned(idx.seguidores7dPct, "%")}
          </strong>
          {idx.seguidores7dProvisorio ? " · acumulando" : ""}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          margin: "10px 0 4px",
        }}
      >
        {PARTES.map((p) => {
          const pesoPct = watchlist
            ? Math.round(watchlist.pesosIndice[p.key] * 100)
            : 0;
          const cel = idx.ingredientes?.[p.key];
          const real = cel?.fonte === "real";
          const nota = cel?.nota ?? null;
          return (
            <InfoTip
              key={p.key}
              texto={p.explica(idx.breakdown[p.key], pesoPct)}
            >
              <span className="m-pill" style={{ opacity: real ? 1 : 0.55 }}>
                <span style={{ color: real ? "#16C784" : "#F5A623" }}>
                  {real ? "●" : "○"}
                </span>{" "}
                {p.label} {watchlist ? `${pesoPct}%` : ""} ·{" "}
                {nota == null ? "—" : nota.toFixed(0)}
              </span>
            </InfoTip>
          );
        })}
      </div>

      <div data-no-swipe onClick={(e) => e.stopPropagation()} style={{ marginTop: 4 }}>
        <div className="m-muted-c" style={{ fontSize: 10, marginBottom: 2 }}>
          pilares · nota 0–100 (z-score vs. páreo)
        </div>
        <Bars3D notas={barsFromIdx(idx)} height={150} />
        <div className="m-muted-c" style={{ fontSize: 10, margin: "8px 0 2px" }}>
          trajetória do índice · 30 dias
        </div>
        <SparkDepth
          valores={closesFromIdx(idx)}
          cor={idx.variacaoDia >= 0 ? "#16C784" : "#EA3943"}
          height={110}
        />
      </div>
      <div className="m-flip-hint">↻ toque para entender o índice e a meta</div>
    </FlashCard>
  );
}

/* ── VERSO — explicação + placar da campanha (fusão com equipe) ── */
function IdxBack({
  equipe,
  agora,
}: {
  equipe: EquipeSnapshot | null;
  agora: number;
}) {
  const g = equipe?.geral;
  const calc = useMemo(() => {
    if (!g) return null;
    const faltam = Math.max(0, g.meta - g.cadastrados);
    const pctMeta = Math.min(100, (g.cadastrados / Math.max(1, g.meta)) * 100);
    const ritmoDia = g.velocidadeMin * 60 * 14; // cadastros/dia (14h de operação)
    const base = agora > 0 ? agora : ELEICAO_MS - 120 * DIA_MS;
    const diasAteEleicao = Math.max(
      1,
      Math.round((ELEICAO_MS - base) / DIA_MS),
    );
    const projecao = g.cadastrados + ritmoDia * diasAteEleicao;
    const dentro = projecao >= g.meta;
    const diasParaMeta = ritmoDia > 0 ? Math.ceil(faltam / ritmoDia) : null;
    // linha de chegada: hoje → projeção no ritmo atual até a eleição
    const pts = Array.from({ length: 9 }, (_, i) =>
      Math.round(g.cadastrados + ritmoDia * diasAteEleicao * (i / 8)),
    );
    return { faltam, pctMeta, ritmoDia, dentro, diasParaMeta, pts };
  }, [g, agora]);

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">O que é o índice SOST?</span>
      </div>
      <p
        style={{
          fontSize: 12.5,
          lineHeight: 1.5,
          margin: "2px 0 8px",
          color: "#cfd6e4",
        }}
      >
        É o <strong>termômetro da campanha</strong>: junta 4 sinais num número
        só, como uma ação na bolsa. <strong>Subiu = candidato em alta.</strong>
      </p>
      <p
        style={{
          fontSize: 11.5,
          lineHeight: 1.45,
          margin: "0 0 8px",
          color: "var(--m-muted)",
        }}
      >
        Mesma filosofia do <strong>Brandwatch</strong> e de índices de
        reputação: um número único que resume a imagem pública do candidato —
        imprensa, sentimento, base online e buzz de busca — para qualquer
        campanha entender de relance se está ganhando ou perdendo terreno.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          margin: "0 0 10px",
        }}
      >
        {(
          [
            ["IRE", "Índice de Reputação Eleitoral — nota composta 0–100: Sentimento 40% · Menções 25% · Imprensa 20% · Crescimento 15%."],
            ["TIRE", "Tendência do IRE: como o IRE do candidato variou nos últimos 7 dias (▲ subindo · ▬ estável · ▼ caindo)."],
            ["PRA", "Posição Relativa Adversários: 100 − (IRE ÷ média × 100), em %. 0 = na média do páreo; negativo = à frente; positivo = atrás."],
            ["TPRA", "Tendência do PRA: média da tendência (ΔIRE em 7 dias) dos concorrentes RJ."],
            ["Crescimento", "Pilar do IRE: variação % da base de seguidores nos últimos 7 dias (base somada das redes)."],
          ] as const
        ).map(([k, d]) => (
          <div key={k} style={{ fontSize: 11, color: "var(--m-muted)" }}>
            <strong style={{ color: "#cfd6e4" }}>{k}</strong> — {d}
          </div>
        ))}
      </div>

      <div className="m-muted-c" style={{ fontSize: 10.5, marginBottom: 6 }}>
        Ingredientes que compõem o índice:
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          marginBottom: 10,
        }}
      >
        {PARTES.map((p) => (
          <div key={p.key} style={{ fontSize: 11, color: "var(--m-muted)" }}>
            <strong style={{ color: "#cfd6e4" }}>{p.label}</strong> — {p.curto}
          </div>
        ))}
      </div>

      <div
        className="m-card-head"
        style={{ borderTop: "1px solid var(--m-border)", paddingTop: 8 }}
      >
        <span className="m-card-title">Placar da campanha</span>
        <LiveBadge ch="equipe" cadenceMs={2000} />
      </div>

      {g && calc ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div className="m-headline-num" style={{ fontSize: 30 }}>
              <Odometer value={g.cadastrados} />
            </div>
            <span className="m-muted-c" style={{ fontSize: 13 }}>
              / {g.meta.toLocaleString("pt-BR")} eleitores
            </span>
          </div>
          <div className="m-bar" style={{ margin: "6px 0 3px" }}>
            <span
              style={{
                width: `${calc.pctMeta}%`,
                background: calc.dentro ? "#16C784" : "#F5A623",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span className="m-mono" style={{ fontSize: 11 }}>
              {calc.pctMeta.toFixed(0)}% · faltam{" "}
              {calc.faltam.toLocaleString("pt-BR")}
            </span>
            <span className={`m-pill ${calc.dentro ? "up" : "amarelo"}`}>
              {calc.dentro ? "DENTRO DA META ✓" : "FORA DA META ⚠"}
            </span>
          </div>

          <div style={{ marginTop: 8 }}>
            <div
              className="m-muted-c"
              style={{ fontSize: 10.5, marginBottom: 2 }}
            >
              chegada realista de cadastros até outubro
            </div>
            <SparkDepth
              valores={calc.pts}
              cor={calc.dentro ? "#16C784" : "#EA3943"}
              height={120}
            />
          </div>

          <SectionLeitura>
            {calc.dentro
              ? `No ritmo de ${Math.round(calc.ritmoDia)} cadastros/dia, a meta é batida em ~${calc.diasParaMeta} dias — dentro do prazo da eleição (outubro).`
              : `No ritmo atual (${Math.round(calc.ritmoDia)}/dia) a meta NÃO fecha até outubro. É preciso acelerar o cadastro para não ficar fora da meta.`}
          </SectionLeitura>
        </>
      ) : (
        <div className="m-ghost">sincronizando placar da equipe…</div>
      )}

      <Link
        href="/m/indice"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "block",
          marginTop: 10,
          padding: "9px 12px",
          borderRadius: 10,
          border: "1px solid rgba(22,199,132,0.35)",
          background: "rgba(22,199,132,0.08)",
          color: "#16C784",
          fontSize: 12,
          fontWeight: 700,
          textAlign: "center",
          textDecoration: "none",
        }}
      >
        Entenda o índice em profundidade →
      </Link>
    </div>
  );
}

export function SostIdxCard() {
  const idx = useLiveChannel<IdxSnapshot>("idx.sost").data;
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;
  const equipe = useLiveChannel<EquipeSnapshot>("equipe");

  if (!idx) {
    return (
      <div className="m-card">
        <div className="m-ghost">sincronizando com o stream…</div>
      </div>
    );
  }

  const glow = idx.variacaoDia >= 0 ? "up" : "down";

  return (
    <ExpandFlipCard
      glow={glow}
      compact={
        <IdxCompact idx={idx} watchlist={watchlist} equipe={equipe.data} />
      }
      front={
        <IdxFront
          idx={idx}
          watchlist={watchlist}
          equipe={equipe.data}
          agora={equipe.lastAt}
        />
      }
      back={<IdxBack equipe={equipe.data} agora={equipe.lastAt} />}
      ariaLabel="Tocar para expandir o índice SOST"
    />
  );
}
