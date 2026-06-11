"use client";

// ★ Fita de concorrentes — carrossel horizontal de cards-ativo, cada
// concorrente com candlestick 30d próprio, legenda nominal completa, cor
// fixa, tag interno PL/externo e linha de referência da votação 2022.
// "Comparar" abre sheet com as 6 séries sobrepostas (legenda interativa +
// pinça via dataZoom inside).

import { useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import {
  candlestickOption,
  compareLinesOption,
  sparklineOption,
} from "@/components/mobile/m-chart-options";
import { BottomSheet } from "@/components/mobile/ui/bottom-sheet";
import { useFlash } from "@/components/mobile/ui/flash-card";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import type { IdxSnapshot, QuoteRj, QuotesRjSnapshot } from "@/lib/live-schemas";
import type { Concorrente, Watchlist } from "@/lib/watchlist";

function CompetitorCard({ meta, quote }: { meta: Concorrente; quote: QuoteRj }) {
  const flash = useFlash(quote.valor);
  const positivo = quote.variacao24h >= 0;

  const candleOpt = useMemo(
    () =>
      candlestickOption({
        candles: [...quote.candles30d, quote.candleVivo],
        compact: true,
        // votos2022/2000 é a escala-base do índice do concorrente — a linha
        // mostra se ele opera acima ou abaixo do próprio patamar de 2022
        refLine: meta.votos2022 ? { value: meta.votos2022 / 2000, label: "2022" } : null,
      }),
    [quote.candles30d, quote.candleVivo, meta.votos2022],
  );
  const sparkOpt = useMemo(
    () => sparklineOption(quote.sparkSeguidores, meta.cor, { area: true }),
    [quote.sparkSeguidores, meta.cor],
  );

  return (
    <article className={`m-quote-card ${flash ? `m-flash-${flash}` : ""}`.trim()}>
      <div className="m-quote-head">
        <span className="m-quote-sym" style={{ color: meta.cor }}>
          {meta.simbolo}
        </span>
        <span className={`m-pill ${meta.interno ? "interno" : "externo"}`}>
          {meta.interno ? "interno PL" : "externo"}
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

      <EChart option={candleOpt} height={88} />

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

export function CompetitorTape() {
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;
  const quotes = useLiveChannel<QuotesRjSnapshot>("quotes.rj").data;
  const idx = useLiveChannel<IdxSnapshot>("idx.sost").data;
  const [compareOpen, setCompareOpen] = useState(false);

  const cards = useMemo(() => {
    if (!watchlist || !quotes) return [];
    const bySimbolo = new Map(quotes.quotes.map((q) => [q.simbolo, q]));
    return watchlist.concorrentes_rj
      .map((meta) => ({ meta, quote: bySimbolo.get(meta.simbolo) }))
      .filter((x): x is { meta: Concorrente; quote: QuoteRj } => Boolean(x.quote));
  }, [watchlist, quotes]);

  const compareOpt = useMemo(() => {
    if (!compareOpen || !watchlist || !quotes || !idx) return null;
    const labels = idx.candles30d.map((c) => {
      const d = new Date(c.t);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    return compareLinesOption({
      labels,
      series: [
        {
          nome: `${watchlist.principal.nome} (${watchlist.principal.partido})`,
          cor: watchlist.principal.cor,
          data: idx.candles30d.map((c) => c.c),
        },
        ...cards.map(({ meta, quote }) => ({
          nome: `${meta.nome} (${meta.partido})`,
          cor: meta.cor,
          data: quote.candles30d.map((c) => c.c),
        })),
      ],
    });
  }, [compareOpen, watchlist, quotes, idx, cards]);

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Fita de concorrentes · RJ</span>
        <LiveBadge ch="quotes.rj" cadenceMs={5000} />
      </div>

      {cards.length ? (
        <>
          <div className="m-carousel" data-no-swipe>
            {cards.map(({ meta, quote }) => (
              <CompetitorCard key={meta.simbolo} meta={meta} quote={quote} />
            ))}
          </div>
          <button
            type="button"
            className="m-btn primary"
            style={{ width: "100%", marginTop: 4 }}
            onClick={() => setCompareOpen(true)}
          >
            Comparar com {watchlist?.principal.simbolo ?? "SOST"} · 30 dias
          </button>
        </>
      ) : (
        <div className="m-ghost">sincronizando cotações…</div>
      )}

      <BottomSheet open={compareOpen} onClose={() => setCompareOpen(false)} title="Comparar · fechamentos 30d (base 100)">
        {compareOpt ? (
          <>
            <EChart option={compareOpt} height={300} />
            <p className="m-muted-c" style={{ fontSize: 10.5, marginTop: 8 }}>
              Toque no nome na legenda para ligar/desligar a série · pinça para
              zoom, arraste para navegar.
            </p>
          </>
        ) : null}
      </BottomSheet>
    </div>
  );
}
