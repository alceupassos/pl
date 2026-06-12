"use client";

// Você vs concorrentes do RJ — ranking claro (substitui a "fita de ações").
// Ordena candidato + 5 concorrentes por força na disputa (relevância) e mostra
// barras com você destacado e a sua posição. Sem candlestick nem jargão.

import { useMemo } from "react";

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import type { IdxSnapshot, QuotesRjSnapshot } from "@/lib/live-schemas";
import type { Watchlist } from "@/lib/watchlist";

type Linha = {
  nome: string;
  partido: string;
  cor: string;
  valor: number;
  variacao: number;
  voce: boolean;
};

export function CompetitorTape() {
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;
  const quotes = useLiveChannel<QuotesRjSnapshot>("quotes.rj").data;
  const idx = useLiveChannel<IdxSnapshot>("idx.sost").data;

  const dados = useMemo(() => {
    if (!watchlist || !quotes || !idx) return null;
    const bySimbolo = new Map(quotes.quotes.map((q) => [q.simbolo, q]));
    const linhas: Linha[] = [
      {
        nome: watchlist.principal.nome,
        partido: watchlist.principal.partido,
        cor: watchlist.principal.cor,
        valor: idx.valor,
        variacao: idx.variacaoDia,
        voce: true,
      },
      ...watchlist.concorrentes_rj
        .map((c) => {
          const q = bySimbolo.get(c.simbolo);
          return q
            ? { nome: c.nome, partido: c.partido, cor: c.cor, valor: q.valor, variacao: q.variacao24h, voce: false }
            : null;
        })
        .filter((x): x is Linha => Boolean(x)),
    ].sort((a, b) => b.valor - a.valor);
    const max = Math.max(...linhas.map((l) => l.valor), 1);
    const posVoce = linhas.findIndex((l) => l.voce) + 1;
    return { linhas, max, posVoce, total: linhas.length };
  }, [watchlist, quotes, idx]);

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Você vs concorrentes · RJ</span>
        <LiveBadge ch="quotes.rj" cadenceMs={5000} />
      </div>
      {dados ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {dados.linhas.map((l, i) => {
              const sobe = l.variacao >= 0;
              return (
                <div
                  key={l.nome}
                  style={{
                    padding: l.voce ? "5px 7px" : "0 7px",
                    borderRadius: 8,
                    background: l.voce ? "rgba(22,199,132,0.10)" : "transparent",
                    border: l.voce ? "1px solid rgba(22,199,132,0.35)" : "1px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 2 }}>
                    <span>
                      <span className="m-mono m-muted-c" style={{ fontSize: 10 }}>{i + 1}º</span>{" "}
                      <span style={{ color: l.cor, fontWeight: 700 }}>{l.nome}</span>
                      {l.voce ? " (você)" : ""}{" "}
                      <span className="m-muted-c" style={{ fontSize: 9.5 }}>{l.partido}</span>
                    </span>
                    <span className={`m-mono ${sobe ? "m-up-c" : "m-down-c"}`} style={{ fontSize: 10.5 }}>
                      {sobe ? "▲" : "▼"} {Math.abs(l.variacao).toFixed(1)}%
                    </span>
                  </div>
                  <div className="m-bar">
                    <span style={{ width: `${(l.valor / dados.max) * 100}%`, background: l.cor }} />
                  </div>
                </div>
              );
            })}
          </div>
          <SectionLeitura>
            Você está em <strong>{dados.posVoce}º de {dados.total}</strong> em força na disputa
            (relevância: imprensa + redes + sentimento). As barras comparam todos no mesmo patamar.
          </SectionLeitura>
        </>
      ) : (
        <div className="m-ghost">sincronizando…</div>
      )}
    </div>
  );
}
