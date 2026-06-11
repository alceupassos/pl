"use client";

// Cards-cotação dos atores nacionais — score -100..+100, seta e sparkline.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { sparklineOption } from "@/components/mobile/m-chart-options";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import type { QuoteNac, QuotesNacSnapshot } from "@/lib/live-schemas";
import type { AtorNacional, Watchlist } from "@/lib/watchlist";

function AtorCard({ meta, quote }: { meta: AtorNacional; quote: QuoteNac }) {
  const cor = quote.score >= 0 ? "#16C784" : "#EA3943";
  const spark = useMemo(() => sparklineOption(quote.spark, cor), [quote.spark, cor]);
  const arrow = quote.dir === "up" ? "▲" : quote.dir === "down" ? "▼" : "▬";

  return (
    <article className="m-quote-card" style={{ flexBasis: 150 }}>
      <div className="m-quote-nome" style={{ marginBottom: 2 }}>
        {meta.nome}
        {meta.partido ? ` · ${meta.partido}` : ""}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="m-quote-val" style={{ color: cor }}>
          <Odometer value={quote.score} signed />
        </span>
        <span className={quote.dir === "down" ? "m-down-c" : quote.dir === "up" ? "m-up-c" : "m-muted-c"} style={{ fontSize: 12 }}>
          {arrow}
        </span>
      </div>
      <EChart option={spark} height={30} />
    </article>
  );
}

export function NationalActors() {
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;
  const nac = useLiveChannel<QuotesNacSnapshot>("quotes.nac").data;

  const cards = useMemo(() => {
    if (!watchlist || !nac) return [];
    const byId = new Map(nac.atores.map((a) => [a.id, a]));
    return watchlist.atores_nacionais
      .map((meta) => ({ meta, quote: byId.get(meta.id) }))
      .filter((x): x is { meta: AtorNacional; quote: QuoteNac } => Boolean(x.quote));
  }, [watchlist, nac]);

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Tabuleiro nacional</span>
        <LiveBadge ch="quotes.nac" cadenceMs={5000} />
      </div>
      {cards.length ? (
        <div className="m-carousel" data-no-swipe>
          {cards.map(({ meta, quote }) => (
            <AtorCard key={meta.id} meta={meta} quote={quote} />
          ))}
        </div>
      ) : (
        <div className="m-ghost">sincronizando…</div>
      )}
    </div>
  );
}
