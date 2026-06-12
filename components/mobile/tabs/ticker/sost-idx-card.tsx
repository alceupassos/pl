"use client";

// SOST-IDX — número-manchete com odômetro + candlestick diário do índice
// composto (pesos da watchlist: menções/sentimento/seguidores/imprensa).

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { candlestickOption } from "@/components/mobile/m-chart-options";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { InfoTip } from "@/components/mobile/ui/info-tip";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import type { IdxSnapshot } from "@/lib/live-schemas";
import type { Watchlist } from "@/lib/watchlist";

// Cada componente do índice + a explicação do que move aquele número (o "ponto
// forte de mudança"), incluindo a fonte e se é dado real ou modelado.
const PARTES: {
  key: keyof IdxSnapshot["breakdown"];
  label: string;
  explica: (valor: number, pesoPct: number) => string;
}[] = [
  {
    key: "mencoes",
    label: "menções",
    explica: (v, p) =>
      `Volume de menções nas redes sociais (peso ${p}% do índice). Valor ${v}. Modelado — fonte social real (Bluesky/Google Trends) chega na próxima fatia.`,
  },
  {
    key: "sentimento",
    label: "sentimento",
    explica: (v, p) =>
      `Tom das manchetes reais sobre o candidato, classificado por IA em português (pysentimiento), positivo vs negativo (peso ${p}%). Valor ${v}; acima de 100 = clima mais favorável.`,
  },
  {
    key: "seguidores",
    label: "seguidores",
    explica: (v, p) =>
      `Crescimento da base de seguidores nas redes (peso ${p}%). Valor ${v}. Modelado — sem fonte gratuita de contagem ainda.`,
  },
  {
    key: "imprensa",
    label: "imprensa",
    explica: (v, p) =>
      `Cobertura de imprensa REAL via Google News (peso ${p}%). Valor ${v}: ritmo de matérias dos últimos dias vs o normal do candidato — acima de 100 = em alta na imprensa.`,
  },
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
            {PARTES.map((p) => {
              const pesoPct = watchlist ? Math.round(watchlist.pesosIndice[p.key] * 100) : 0;
              const valor = idx.breakdown[p.key];
              return (
                <InfoTip key={p.key} texto={p.explica(valor, pesoPct)}>
                  <span className="m-pill">
                    {p.label} {watchlist ? `${pesoPct}%` : ""} ·{" "}
                    <Odometer value={valor} decimals={1} />
                  </span>
                </InfoTip>
              );
            })}
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
