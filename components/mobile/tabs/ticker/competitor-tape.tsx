"use client";

// Você vs concorrentes do RJ — comparação estilo bolsa.
// FRENTE: evolução em 30 dias (você × concorrentes) em linhas normalizadas,
// como um gráfico de cotações. VERSO (toque): rastreabilidade dos dados —
// de onde vem cada série, componente a componente, com badge real/simulado.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { compareLinesOption } from "@/components/mobile/m-chart-options";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { MAvatar } from "@/components/mobile/ui/m-avatar";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { getAvatar } from "@/lib/avatars";
import type { IdxSnapshot, QuotesRjSnapshot } from "@/lib/live-schemas";
import { FONTE_COMO } from "@/lib/mobile/fonte-meta";
import type { Watchlist } from "@/lib/watchlist";

/* ── FRENTE: gráfico estilo bolsa — evolução de 30 dias (você × concorrentes) ── */
function CompetitorFront() {
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
    <div className="m-card">
      <div className="m-card-head">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {watchlist ? (
            <MAvatar src={getAvatar("SOST")} nome="Sóstenes" cor={watchlist.principal.cor} size={26} />
          ) : null}
          <span className="m-card-title">Você × concorrentes · 30 dias</span>
        </span>
        <FonteBadge
          real={!!idx?.fontes && Object.values(idx.fontes).some((f) => f === "real")}
          como={`${FONTE_COMO.idxComposto} Base 2022: ${FONTE_COMO.votos2022}`}
        />
        <LiveBadge ch="quotes.rj" cadenceMs={5000} />
      </div>
      {opt ? (
        <>
          <div data-no-swipe onClick={(e) => e.stopPropagation()}>
            <EChart option={opt} height={210} />
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
      <div className="m-flip-hint">↻ toque para ver a rastreabilidade dos dados</div>
    </div>
  );
}

/* ── VERSO: rastreabilidade — de onde vem cada série do gráfico ── */

function LinhaFonte({
  titulo,
  real,
  como,
  children,
}: {
  titulo: string;
  real: boolean;
  como?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "7px 10px",
        borderRadius: 10,
        background: "var(--m-card-2)",
        border: "1px solid var(--m-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
        <strong style={{ fontSize: 11.5 }}>{titulo}</strong>
        <FonteBadge real={real} como={como} />
      </div>
      <div style={{ fontSize: 10.5, lineHeight: 1.5, color: "var(--m-muted)" }}>{children}</div>
    </div>
  );
}

const COMPONENTES_IDX: { key: keyof NonNullable<IdxSnapshot["fontes"]>; nome: string; como: string }[] = [
  { key: "imprensa", nome: "imprensa", como: FONTE_COMO.imprensa },
  { key: "sentimento", nome: "sentimento", como: FONTE_COMO.sentimento },
  { key: "seguidores", nome: "seguidores", como: FONTE_COMO.seguidores },
  { key: "mencoes", nome: "menções", como: FONTE_COMO.mencoes },
];

function CompetitorBack() {
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;
  const idx = useLiveChannel<IdxSnapshot>("idx.sost").data;

  const nomePrincipal = watchlist?.principal.nome ?? "o candidato";
  const votos = watchlist?.principal.votos2022;

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">De onde vêm os dados do gráfico</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <LinhaFonte
          titulo={`Sua série (${watchlist?.principal.simbolo ?? "SOST"}-IDX)`}
          real={!!idx?.fontes && Object.values(idx.fontes).some((f) => f === "real")}
          como={FONTE_COMO.idxComposto}
        >
          Índice composto de {nomePrincipal}: média ponderada de 4 componentes. Estado de cada um
          agora:
          <span style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
            {COMPONENTES_IDX.map((c) => (
              <span key={c.key} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 10, color: "#cfd6e4" }}>{c.nome}</span>
                <FonteBadge real={idx?.fontes?.[c.key] === "real"} como={c.como} />
              </span>
            ))}
          </span>
        </LinhaFonte>

        <LinhaFonte titulo="Séries dos concorrentes" real={false}>
          Curvas modeladas (sem fonte gratuita de imagem diária dos adversários), mas{" "}
          <strong style={{ color: "#cfd6e4" }}>calibradas pela base real do TSE 2022</strong>: o
          patamar de cada concorrente parte dos votos oficiais de deputado federal RJ.{" "}
          {FONTE_COMO.votos2022}
        </LinhaFonte>

        <LinhaFonte titulo="Histórico de 30 dias" real={false}>
          Fechamentos do seu índice são gravados diariamente em cache local (idx-history) — os dias
          coletados são reais; dias anteriores à ativação da coleta são modelados.
        </LinhaFonte>

        {votos ? (
          <SectionLeitura>
            Base eleitoral 2022 de {nomePrincipal}: <strong>{votos.toLocaleString("pt-BR")} votos</strong>{" "}
            (TSE, resultado oficial) — é a âncora real da comparação com os concorrentes.
          </SectionLeitura>
        ) : null}
      </div>
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
          <span className="m-card-title">Você × concorrentes · 30 dias</span>
          <LiveBadge ch="quotes.rj" cadenceMs={5000} />
        </div>
        <div className="m-ghost">sincronizando…</div>
      </div>
    );
  }

  return <FlipCard front={<CompetitorFront />} back={<CompetitorBack />} />;
}
