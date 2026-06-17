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
import { candlestickOption, closeLineOption } from "@/components/mobile/m-chart-options";
import { Bars3D, SparkDepth } from "@/components/mobile/ui/fx3d";
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
      `Crescimento da base: variação % dos seguidores somados das redes nos últimos 7 dias (peso ${p}% do IRE), real via Bright Data/yt-dlp. Nota atual ${v}; acima de 50 = base crescendo mais que o páreo.`,
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

// PRA = (Score ÷ média × 100) − 100, em %. 0 = na média do páreo; positivo = à
// frente dos adversários (verde); negativo = atrás (vermelho).
function corPra(v: number | null): string {
  if (v == null) return "var(--m-muted)";
  if (v > 0.05) return "#16C784";
  if (v < -0.05) return "#EA3943";
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


// Métrica sub-maior (IRE / PRA): sigla + valor + setinha de tendência colada,
// com legenda pequena opcional embaixo (card expandido).
function SubMetrica({
  sigla,
  valor,
  valorCor,
  trendSym,
  trendCor,
  legenda,
  compact,
}: {
  sigla: string;
  valor: React.ReactNode;
  valorCor: string;
  trendSym?: string;
  trendCor?: string;
  legenda?: string;
  compact?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
      {/* rótulo EM CIMA do número */}
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: "var(--m-muted)" }}>
        {sigla}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" }}>
        <span
          className="m-mono"
          style={{ fontSize: compact ? 23 : 34, fontWeight: 800, lineHeight: 1, color: valorCor }}
        >
          {valor}
        </span>
        {/* tendência: só o símbolo (▲ ▬ ▼) — sem Δ e sem "7d" */}
        {trendSym ? (
          <span
            className="m-mono"
            style={{ fontSize: compact ? 16 : 20, fontWeight: 800, lineHeight: 1, color: trendCor }}
          >
            {trendSym}
          </span>
        ) : null}
      </div>
      {legenda ? (
        <span style={{ fontSize: 8.5, color: "var(--m-muted)", lineHeight: 1.1 }}>{legenda}</span>
      ) : null}
    </div>
  );
}

// Resumo do índice: SENTIMENTO (número herói) + IRE/PRA empilhados ao lado (com
// setinha de tendência colada) + gráfico. Compacto = LINHA ao lado; expandido =
// CANDLE abaixo, com eixos X/Y e legenda.
function IdxResumo({ idx, expanded }: { idx: IdxSnapshot; expanded?: boolean }) {
  const compact = !expanded;
  const ire = idx.reputacao ?? null;
  const pra = idx.posicao ?? null;
  const indice = idx.ingredientes?.sentimento?.valor ?? idx.breakdown?.sentimento ?? null;
  const net = indice == null ? null : indice - 100;
  const candles = useMemo(() => [...idx.candles30d.slice(-7), idx.candleVivo], [idx]);
  const chartOpt = useMemo(
    () =>
      expanded
        ? candlestickOption({ candles, compact: false, refLine: null })
        : closeLineOption({ candles, compact: true, cor: corReputacao(ire), refLine: null }),
    [candles, expanded, ire],
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: expanded ? 8 : 6 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: expanded ? 16 : 10 }}>
        {/* SENTIMENTO — número herói (o maior). Badges pequenos ao lado do rótulo. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.07em", color: "var(--m-muted)" }}>
              SENTIMENTO
            </span>
            <LeituraIA
              card="ticker-sost-idx"
              contexto={`sentimento net ${net == null ? "—" : net.toFixed(1)}%; IRE ${ire ?? "—"}; PRA ${pra == null ? "—" : `${pra.toFixed(1)}%`}`}
              titulo="Índice de Reputação Eleitoral"
            />
            <FonteBadge real={idxTemReal(idx)} como={FONTE_COMO.idxComposto} />
            <LiveBadge ch="idx.sost" cadenceMs={2000} />
          </div>
          <span
            className="m-mono"
            style={{
              fontWeight: 900,
              lineHeight: 1,
              color: corSentNet(net),
              display: "inline-flex",
              alignItems: "baseline",
            }}
          >
            {net == null ? (
              <span style={{ fontSize: expanded ? 68 : 46 }}>—</span>
            ) : (
              (() => {
                const full = fmtSigned(net, "%");
                const ci = full.indexOf(",");
                const intPart = ci >= 0 ? full.slice(0, ci) : full;
                const rest = ci >= 0 ? full.slice(ci) : "";
                return (
                  <>
                    <span style={{ fontSize: expanded ? 68 : 46 }}>{intPart}</span>
                    <span style={{ fontSize: expanded ? 30 : 20 }}>{rest}</span>
                  </>
                );
              })()
            )}
          </span>
          <span style={{ fontSize: expanded ? 9.5 : 8, color: "var(--m-muted)", lineHeight: 1.15 }}>
            (menções positivas − negativas) ÷ nº de menções
          </span>
        </div>

        {/* IRE e PRA — sub-maiores, empilhados, setinha colada */}
        <div style={{ display: "flex", flexDirection: "column", gap: expanded ? 8 : 6, flexShrink: 0 }}>
          <SubMetrica
            sigla="IRE"
            valor={ire == null ? "—" : <Odometer value={ire} decimals={0} />}
            valorCor={corReputacao(ire)}
            compact={compact}
            legenda={expanded ? "Índice de Reputação Eleitoral" : undefined}
            trendSym={expanded ? TEND[idx.tendencia ?? "flat"].sym : undefined}
            trendCor={expanded ? TEND[idx.tendencia ?? "flat"].cor : undefined}
          />
          <SubMetrica
            sigla="PRA"
            valor={pra == null ? "—" : fmtSigned(pra, "%")}
            valorCor={corPra(pra)}
            compact={compact}
            legenda={expanded ? "Percentual Relativo Adversário" : undefined}
            trendSym={expanded ? TEND[idx.tendenciaAdversarios ?? "flat"].sym : undefined}
            trendCor={expanded ? TEND[idx.tendenciaAdversarios ?? "flat"].cor : undefined}
          />
        </div>

        {/* Gráfico de LINHA ao lado (card compacto) */}
        {compact ? (
          <div
            data-no-swipe
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, minWidth: 64, alignSelf: "stretch", display: "flex", alignItems: "center" }}
          >
            <EChart option={chartOpt} height={66} />
          </div>
        ) : null}
      </div>

      {/* Gráfico CANDLE abaixo (card expandido), com eixos X/Y + legenda */}
      {expanded ? (
        <div data-no-swipe onClick={(e) => e.stopPropagation()}>
          <div className="m-muted-c" style={{ fontSize: 9.5, marginBottom: 2 }}>
            índice · candles diários · eixo X: data · eixo Y: valor (dir.) · verde sobe / vermelho cai
          </div>
          <EChart option={chartOpt} height={140} />
        </div>
      ) : null}
    </div>
  );
}

// Cor do net de sentimento: positivo (mais elogio que crítica) = verde.
function corSentNet(v: number | null): string {
  if (v == null) return "var(--m-muted)";
  if (v > 0.5) return "#16C784";
  if (v < -0.5) return "#EA3943";
  return "#8a93a8";
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
        <span className="m-card-title" style={{ color: "#e8ecf4", fontWeight: 800 }}>
          ÍNDICE DE REPUTAÇÃO ELEITORAL · {watchlist?.principal.simbolo ?? "SOST"}-IDX
        </span>
        <MetaPills alcancado={cadastrados} />
      </div>

      <IdxResumo idx={idx} />
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
        <span className="m-card-title" style={{ color: "#e8ecf4", fontWeight: 800 }}>
          ÍNDICE DE REPUTAÇÃO ELEITORAL · {watchlist?.principal.simbolo ?? "SOST"}-IDX
        </span>
        <MetaRing
          alcancado={cadastrados}
          meta={META_ELEITORES}
          noRitmo={noRitmo}
        />
      </div>

      <IdxResumo idx={idx} expanded />

      <div
        className="m-mono"
        style={{ fontSize: 10.5, color: "#9fe7ff", textAlign: "left", margin: "6px 0 4px" }}
      >
        IRE = 40%·Sent + 25%·Menç + 20%·Impr + 15%·Cresc
      </div>

      {idx.seguidores7dPct != null ? (
        <div className="m-muted-c" style={{ fontSize: 10.5, margin: "6px 0 0" }}>
          seguidores · últimos 7 dias:{" "}
          <strong style={{ color: idx.seguidores7dPct >= 0 ? "#16C784" : "#EA3943" }}>
            {fmtSigned(idx.seguidores7dPct, "%")}
          </strong>
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
            ["PRA", "Posição Relativa Adversários: (IRE ÷ média × 100) − 100, em %. 0 = na média do páreo; positivo = à frente; negativo = atrás."],
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
