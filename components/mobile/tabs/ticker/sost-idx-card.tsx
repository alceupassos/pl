"use client";

// SOST-IDX — número-manchete com odômetro + candlestick diário do índice
// composto (pesos da watchlist: menções/sentimento/seguidores/imprensa).

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { candlestickOption } from "@/components/mobile/m-chart-options";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import type { IdxSnapshot } from "@/lib/live-schemas";
import type { Watchlist } from "@/lib/watchlist";

const PARTES: { key: keyof IdxSnapshot["breakdown"]; label: string }[] = [
  { key: "mencoes", label: "menções" },
  { key: "sentimento", label: "sentimento" },
  { key: "seguidores", label: "seguidores" },
  { key: "imprensa", label: "imprensa" },
];

export function SostIdxCard() {
  const idx = useLiveChannel<IdxSnapshot>("idx.sost").data;
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;

  const option = useMemo(() => {
    if (!idx) return null;
    return candlestickOption({ candles: [...idx.candles30d, idx.candleVivo] });
  }, [idx]);

  const positivo = (idx?.variacaoDia ?? 0) >= 0;

  return (
    <FlashCard watch={idx?.valor}>
      <div className="m-card-head">
        <span className="m-card-title">
          {watchlist?.principal.simbolo ?? "SOST"}-IDX · índice do candidato
        </span>
        <LiveBadge ch="idx.sost" cadenceMs={2000} />
      </div>

      {idx ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <div className="m-headline-num">
              <Odometer value={idx.valor} decimals={2} />
            </div>
            <div className={`m-headline-var ${positivo ? "m-up-c" : "m-down-c"}`}>
              {positivo ? "▲" : "▼"} <Odometer value={idx.variacaoDia} decimals={2} signed suffix="%" /> hoje
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0 4px" }}>
            {PARTES.map((p) => (
              <span className="m-pill" key={p.key}>
                {p.label}{" "}
                {watchlist ? `${Math.round(watchlist.pesosIndice[p.key] * 100)}%` : ""} ·{" "}
                <Odometer value={idx.breakdown[p.key]} decimals={1} />
              </span>
            ))}
          </div>

          {option ? (
            <div data-no-swipe>
              <EChart option={option} height={188} />
            </div>
          ) : null}
        </>
      ) : (
        <div className="m-ghost">sincronizando com o stream…</div>
      )}
    </FlashCard>
  );
}
