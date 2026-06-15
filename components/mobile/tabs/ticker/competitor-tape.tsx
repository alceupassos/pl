"use client";

// Fita de concorrentes estilo bolsa — carrossel horizontal com candlestick
// por ativo. FRENTE: fita (você + concorrentes RJ). VERSO (toque): comparativo
// de todos em 30 dias (linhas normalizadas).

import { useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import {
  candlestickOption,
  closeLineOption,
  compareLinesOption,
  sparklineOption,
} from "@/components/mobile/m-chart-options";
import { ChartModeToggle, type ChartMode } from "@/components/mobile/ui/chart-mode-toggle";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { useFlash } from "@/components/mobile/ui/flash-card";
import { LeituraIA } from "@/components/mobile/ui/leitura-ia";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import type { IdxSnapshot, QuoteRj, QuotesRjSnapshot } from "@/lib/live-schemas";
import { FONTE_COMO } from "@/lib/mobile/fonte-meta";
import type { Concorrente, Watchlist } from "@/lib/watchlist";

type MetaAtivo = {
  simbolo: string;
  nome: string;
  partido: string;
  cor: string;
  votos2022?: number | null;
  interno?: boolean;
};

type CardAtivo = {
  meta: MetaAtivo;
  quote: QuoteRj;
  voce: boolean;
};

function fmtSeguidores(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (n >= 1_000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString("pt-BR");
}

function quoteChartOption(meta: MetaAtivo, quote: QuoteRj, mode: ChartMode) {
  const candles = [...quote.candles30d, quote.candleVivo];
  const refLine =
    meta.votos2022 && meta.votos2022 > 0
      ? { value: meta.votos2022 / 2000, label: "2022" }
      : null;
  return mode === "candle"
    ? candlestickOption({ candles, compact: true, refLine })
    : closeLineOption({ candles, compact: true, cor: meta.cor, refLine });
}

const TEND_C = {
  up: { sym: "▲", cor: "#16C784" },
  flat: { sym: "▬", cor: "#8a93a8" },
  down: { sym: "▼", cor: "#EA3943" },
} as const;

function corRep(v: number | null): string {
  if (v == null) return "var(--m-muted)";
  if (v >= 60) return "#16C784";
  if (v >= 45) return "#F5A623";
  return "#EA3943";
}

// PRA = 100 − (Score ÷ média × 100), em %. negativo = à frente (verde).
function corPra(v: number | null): string {
  if (v == null) return "var(--m-muted)";
  if (v < -0.05) return "#16C784";
  if (v > 0.05) return "#EA3943";
  return "#8a93a8";
}

function fmtSigned(v: number, suffix = ""): string {
  const sinal = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sinal}${Math.abs(v).toFixed(1).replace(".", ",")}${suffix}`;
}

function MiniValor({ label, value, cor }: { label: string; value: number | null; cor: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span className="m-mono" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, color: cor }}>
        {value == null ? "—" : Math.round(value)}
      </span>
      <span
        style={{ fontSize: 7.5, color: "var(--m-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}
      >
        {label}
      </span>
    </div>
  );
}

function QuoteTres({ quote }: { quote: QuoteRj }) {
  const rep = quote.reputacao ?? null;
  const pos = quote.posicao ?? null;
  const tend = TEND_C[quote.tendencia ?? "flat"];
  return (
    <div style={{ display: "flex", gap: 12, margin: "6px 0 2px", alignItems: "flex-end" }}>
      <MiniValor label="IRE" value={rep} cor={corRep(rep)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span
          className="m-mono"
          style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: corPra(pos) }}
        >
          {pos == null ? "—" : fmtSigned(pos, "%")}
        </span>
        <span
          style={{ fontSize: 7.5, color: "var(--m-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}
        >
          PRA
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span className="m-mono" style={{ fontSize: 16, fontWeight: 800, lineHeight: 1, color: tend.cor }}>
          {tend.sym}
        </span>
        <span
          style={{ fontSize: 7.5, color: "var(--m-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}
        >
          TIRE
        </span>
      </div>
    </div>
  );
}

function CompetitorCard({ item, chartMode }: { item: CardAtivo; chartMode: ChartMode }) {
  const { meta, quote, voce } = item;
  const flash = useFlash(quote.reputacao ?? quote.valor);
  const interno = meta.interno ?? false;

  const chartOpt = useMemo(
    () => quoteChartOption(meta, quote, chartMode),
    [meta, quote, chartMode],
  );

  const sparkOpt = useMemo(
    () => sparklineOption(quote.sparkSeguidores, meta.cor, { area: true }),
    [quote.sparkSeguidores, meta.cor],
  );

  return (
    <article
      className={`m-quote-card ${flash ? `m-flash-${flash}` : ""}`.trim()}
      style={
        voce
          ? { borderColor: "rgba(22,199,132,0.45)", boxShadow: "0 0 0 1px rgba(22,199,132,0.2)" }
          : undefined
      }
    >
      <div className="m-quote-head">
        <span className="m-quote-sym" style={{ color: meta.cor }}>
          {meta.simbolo}
        </span>
        <span className={`m-pill ${voce ? "up" : interno ? "interno" : "externo"}`}>
          {voce ? "você" : interno ? "interno PL" : "externo"}
        </span>
      </div>
      <div className="m-quote-nome">
        {meta.nome} ({meta.partido}-RJ)
      </div>

      <QuoteTres quote={quote} />

      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={chartOpt} height={88} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <span className="m-muted-c" style={{ fontSize: 9, fontFamily: "var(--m-font-mono)" }}>
          seguidores
        </span>
        {quote.seguidoresReais != null ? (
          <span className="m-mono" style={{ fontSize: 11, fontWeight: 700 }}>
            {fmtSeguidores(quote.seguidoresReais)}
          </span>
        ) : null}
        <div style={{ flex: 1 }}>
          <EChart option={sparkOpt} height={26} />
        </div>
        <FonteBadge real={quote.fonteSeguidores === "real"} como={FONTE_COMO.seguidoresRede} />
      </div>
      {meta.votos2022 ? (
        <div className="m-muted-c" style={{ fontSize: 9.5, marginTop: 4, fontFamily: "var(--m-font-mono)" }}>
          2022: {meta.votos2022.toLocaleString("pt-BR")} votos
        </div>
      ) : (
        <div className="m-muted-c" style={{ fontSize: 9.5, marginTop: 4, fontFamily: "var(--m-font-mono)" }}>
          1º mandato em disputa na lista
        </div>
      )}
    </article>
  );
}

/* ── FRENTE: fita de concorrentes (carrossel candlestick) ── */
function CompetitorFront() {
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;
  const quotes = useLiveChannel<QuotesRjSnapshot>("quotes.rj").data;
  const idx = useLiveChannel<IdxSnapshot>("idx.sost").data;
  const [chartMode, setChartMode] = useState<ChartMode>("candle");

  const cards = useMemo((): CardAtivo[] => {
    if (!watchlist || !quotes || !idx) return [];
    const bySimbolo = new Map(quotes.quotes.map((q) => [q.simbolo, q]));
    const voce: CardAtivo = {
      meta: {
        simbolo: watchlist.principal.simbolo,
        nome: watchlist.principal.nome,
        partido: watchlist.principal.partido,
        cor: watchlist.principal.cor,
        votos2022: watchlist.principal.votos2022,
      },
      quote: {
        simbolo: watchlist.principal.simbolo,
        valor: idx.valor,
        variacao24h: idx.variacaoDia,
        candles30d: idx.candles30d,
        candleVivo: idx.candleVivo,
        sparkSeguidores: idx.candles30d.slice(-14).map((c) => c.c),
        seguidoresReais: null,
        fonteSeguidores: idx.fontes?.seguidores === "real" ? "real" : "modelado",
        reputacao: idx.reputacao,
        posicao: idx.posicao,
        tendencia: idx.tendencia,
        tendenciaDelta: idx.tendenciaDelta,
        tendenciaProvisoria: idx.tendenciaProvisoria,
        tendenciaAdversarios: idx.tendenciaAdversarios,
        tendenciaAdversariosDelta: idx.tendenciaAdversariosDelta,
        tendenciaAdversariosProvisoria: idx.tendenciaAdversariosProvisoria,
        seguidores7dPct: idx.seguidores7dPct,
        seguidores7dProvisorio: idx.seguidores7dProvisorio,
        ingredientes: idx.ingredientes,
      },
      voce: true,
    };
    const rivais: CardAtivo[] = watchlist.concorrentes_rj.flatMap((c: Concorrente) => {
      const quote = bySimbolo.get(c.simbolo);
      if (!quote) return [];
      return [{ meta: c, quote, voce: false }];
    });
    return [voce, ...rivais];
  }, [watchlist, quotes, idx]);

  const ctxIa = cards.length
    ? `você ${idx?.valor.toFixed(2)} (${idx?.variacaoDia.toFixed(1)}%); ${cards.length - 1} concorrentes na fita`
    : "";

  // A fita tem dado real quando ao menos um concorrente traz seguidores reais.
  const fitaReal = useMemo(
    () => cards.some((c) => c.quote.fonteSeguidores === "real"),
    [cards],
  );

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Fita de concorrentes · RJ</span>
        <LeituraIA card="ticker-competitor" contexto={ctxIa} titulo="Fita concorrentes" />
        <FonteBadge
          real={fitaReal}
          como={`Seguidores: ${FONTE_COMO.seguidoresRede} · Cotação/índice: ${FONTE_COMO.idxComposto}`}
        />
        <ChartModeToggle mode={chartMode} onChange={setChartMode} />
        <LiveBadge ch="quotes.rj" cadenceMs={5000} />
      </div>

      {cards.length ? (
        <div className="m-carousel" data-no-swipe>
          {cards.map((item) => (
            <CompetitorCard key={item.meta.simbolo} item={item} chartMode={chartMode} />
          ))}
        </div>
      ) : (
        <div className="m-ghost">sincronizando cotações…</div>
      )}

      <SectionLeitura>
        Arraste para o lado: cada card é um concorrente com gráfico de 30 dias
        (candlestick ou linha — use ▮▮ / 〰 no topo).
      </SectionLeitura>
      <div className="m-flip-hint">↻ toque para ver o comparativo de todos · 30 dias</div>
    </div>
  );
}

/* ── VERSO: comparativo de todos (você × concorrentes · 30 dias) ── */
function CompetitorBack() {
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;
  const quotes = useLiveChannel<QuotesRjSnapshot>("quotes.rj").data;
  const idx = useLiveChannel<IdxSnapshot>("idx.sost").data;

  const opt = useMemo(() => {
    if (!watchlist || !quotes || !idx) return null;
    const labels = idx.candles30d.map((c) => {
      const d = new Date(c.t);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const series = [
      { nome: watchlist.principal.nome, cor: watchlist.principal.cor, data: idx.candles30d.map((c) => c.c) },
      ...watchlist.concorrentes_rj
        .map((c) => {
          const q = quotes.quotes.find((x) => x.simbolo === c.simbolo);
          return q ? { nome: c.nome, cor: c.cor, data: q.candles30d.map((k) => k.c) } : null;
        })
        .filter((x): x is { nome: string; cor: string; data: number[] } => Boolean(x)),
    ];
    return compareLinesOption({ labels, series });
  }, [watchlist, quotes, idx]);

  const leitura = useMemo(() => {
    if (!watchlist || !idx) return null;
    const candles = idx.candles30d;
    if (candles.length < 2) return null;
    const ini = candles[0].c;
    const fim = candles[candles.length - 1].c;
    const delta = ini !== 0 ? ((fim - ini) / ini) * 100 : 0;
    const subindo = delta >= 0;
    const bySimbolo = new Map((quotes?.quotes ?? []).map((q) => [q.simbolo, q]));
    const proximo = watchlist.concorrentes_rj
      .map((c) => {
        const q = bySimbolo.get(c.simbolo);
        return q ? { nome: c.nome, valor: q.valor } : null;
      })
      .filter((x): x is { nome: string; valor: number } => Boolean(x))
      .sort((a, b) => Math.abs(a.valor - idx.valor) - Math.abs(b.valor - idx.valor))[0];
    return { subindo, delta: Math.abs(delta), proximo };
  }, [watchlist, quotes, idx]);

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Comparativo · todos · 30 dias</span>
        <LiveBadge ch="quotes.rj" cadenceMs={5000} />
      </div>
      {opt ? (
        <>
          <div data-no-swipe onClick={(e) => e.stopPropagation()}>
            <EChart option={opt} height={220} />
          </div>
          <p className="m-muted-c" style={{ fontSize: 10.5, marginTop: 6 }}>
            Toque no nome na legenda para ligar/desligar a série · pinça para zoom.
          </p>
          <SectionLeitura>
            {leitura ? (
              <>
                Você está <strong>{leitura.subindo ? "subindo" : "caindo"}</strong>{" "}
                {leitura.delta.toFixed(1)}% nos 30 dias
                {leitura.proximo ? <> · concorrente mais próximo: <strong>{leitura.proximo.nome}</strong></> : null}.
              </>
            ) : (
              "Compare a sua curva com a dos concorrentes ao longo dos 30 dias."
            )}
          </SectionLeitura>
        </>
      ) : (
        <div className="m-ghost">sincronizando…</div>
      )}
    </div>
  );
}

export function CompetitorTape() {
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;
  const quotes = useLiveChannel<QuotesRjSnapshot>("quotes.rj").data;
  const idx = useLiveChannel<IdxSnapshot>("idx.sost").data;

  if (!watchlist || !quotes || !idx) {
    return (
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Fita de concorrentes · RJ</span>
          <LiveBadge ch="quotes.rj" cadenceMs={5000} />
        </div>
        <div className="m-ghost">sincronizando…</div>
      </div>
    );
  }

  return <FlipCard front={<CompetitorFront />} back={<CompetitorBack />} />;
}
