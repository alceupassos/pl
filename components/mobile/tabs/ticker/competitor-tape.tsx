"use client";

// Você vs concorrentes do RJ — ranking claro (substitui a "fita de ações").
// FRENTE: ordena candidato + 5 concorrentes por força na disputa (relevância) e
// mostra barras com você destacado e a sua posição. Sem candlestick nem jargão.
// VERSO (toque): traz de volta a comparação estilo bolsa — evolução em 30 dias
// (você × concorrentes) em linhas normalizadas. Toque no nome liga/desliga série.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { compareLinesOption } from "@/components/mobile/m-chart-options";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { MAvatar } from "@/components/mobile/ui/m-avatar";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { getAvatar } from "@/lib/avatars";
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

/* ── FRENTE: ranking de força na disputa (mantido 100% intacto) ── */
function CompetitorFront() {
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
            (relevância: imprensa + redes + sentimento).{" "}
            {watchlist?.principal.votos2022
              ? `Base eleitoral 2022: ${watchlist.principal.votos2022.toLocaleString("pt-BR")} votos (TSE).`
              : ""}
          </SectionLeitura>
        </>
      ) : (
        <div className="m-ghost">sincronizando…</div>
      )}
      <div className="m-flip-hint">↻ toque para ver a evolução em 30 dias</div>
    </div>
  );
}

/* ── VERSO: comparação estilo bolsa — evolução de 30 dias (você × concorrentes) ── */
function CompetitorBack() {
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;
  const quotes = useLiveChannel<QuotesRjSnapshot>("quotes.rj").data;
  const idx = useLiveChannel<IdxSnapshot>("idx.sost").data;

  const opt = useMemo(() => {
    if (!watchlist || !quotes || !idx) return null;
    // Eixo X: datas dd/mm derivadas dos candles do índice do candidato.
    const labels = idx.candles30d.map((c) => {
      const d = new Date(c.t);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    // Séries: candidato + cada concorrente que tenha cotação correspondente.
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

  // Leitura simples: você × concorrente mais próximo (em força) nos 30 dias.
  const leitura = useMemo(() => {
    if (!watchlist || !idx) return null;
    const candles = idx.candles30d;
    if (candles.length < 2) return null;
    const ini = candles[0].c;
    const fim = candles[candles.length - 1].c;
    const delta = ini !== 0 ? ((fim - ini) / ini) * 100 : 0;
    const subindo = delta >= 0;
    // concorrente mais próximo pelo valor atual de cada cotação.
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
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {watchlist ? (
            <MAvatar src={getAvatar("SOST")} nome="Sóstenes" cor={watchlist.principal.cor} size={26} />
          ) : null}
          <span className="m-card-title">Você × concorrentes · 30 dias</span>
        </span>
        <LiveBadge ch="quotes.rj" cadenceMs={5000} />
      </div>
      {opt ? (
        <>
          <div data-no-swipe onClick={(e) => e.stopPropagation()}>
            <EChart option={opt} height={220} />
          </div>
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
          <span className="m-card-title">Você vs concorrentes · RJ</span>
          <LiveBadge ch="quotes.rj" cadenceMs={5000} />
        </div>
        <div className="m-ghost">sincronizando…</div>
      </div>
    );
  }

  return <FlipCard front={<CompetitorFront />} back={<CompetitorBack />} />;
}
