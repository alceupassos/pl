"use client";

// Fita de concorrentes estilo bolsa — carrossel horizontal com candlestick
// por ativo. FRENTE: fita (você + concorrentes RJ). VERSO (toque): comparativo
// de todos em 30 dias (linhas normalizadas).

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import {
  candlestickOption,
  compareLinesOption,
  sparklineOption,
} from "@/components/mobile/m-chart-options";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { useFlash } from "@/components/mobile/ui/flash-card";
import { LeituraIA } from "@/components/mobile/ui/leitura-ia";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
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

function CompetitorCard({ item }: { item: CardAtivo }) {
  const { meta, quote, voce } = item;
  const flash = useFlash(quote.valor);
  const positivo = quote.variacao24h >= 0;
  const interno = meta.interno ?? false;

  const candleOpt = useMemo(
    () =>
      candlestickOption({
        candles: [...quote.candles30d, quote.candleVivo],
        compact: true,
        refLine:
          meta.votos2022 && meta.votos2022 > 0
            ? { value: meta.votos2022 / 2000, label: "2022" }
            : null,
      }),
    [quote.candles30d, quote.candleVivo, meta.votos2022],
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

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0 2px" }}>
        <span className="m-quote-val">
          <Odometer value={quote.valor} decimals={2} />
        </span>
        <span className={`m-mono ${positivo ? "m-up-c" : "m-down-c"}`} style={{ fontSize: 11.5, fontWeight: 700 }}>
          {positivo ? "▲" : "▼"} <Odometer value={quote.variacao24h} decimals={2} signed suffix="%" />
        </span>
      </div>

      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={candleOpt} height={88} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <span className="m-muted-c" style={{ fontSize: 9, fontFamily: "var(--m-font-mono)" }}>
          seguidores 14d
        </span>
        <div style={{ flex: 1 }}>
          <EChart option={sparkOpt} height={26} />
        </div>
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

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Fita de concorrentes · RJ</span>
        <LeituraIA card="ticker-competitor" contexto={ctxIa} titulo="Fita concorrentes" />
        <FonteBadge
          real={!!idx?.fontes && Object.values(idx.fontes).some((f) => f === "real")}
          como={`${FONTE_COMO.idxComposto} Base 2022: ${FONTE_COMO.votos2022}`}
        />
        <LiveBadge ch="quotes.rj" cadenceMs={5000} />
      </div>

      {cards.length ? (
        <div className="m-carousel" data-no-swipe>
          {cards.map((item) => (
            <CompetitorCard key={item.meta.simbolo} item={item} />
          ))}
        </div>
      ) : (
        <div className="m-ghost">sincronizando cotações…</div>
      )}

      <SectionLeitura>
        Arraste para o lado: cada card é um concorrente com candlestick de 30 dias,
        como uma ação na bolsa.
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
