"use client";

// Corrida presidencial 2026 — intenção de voto REAL (pesquisas da Wikipédia,
// via sidecar) dos 5 nomes que o usuário acompanha: Lula, Flávio Bolsonaro,
// Renan Santos, Ronaldo Caiado, Zema. Ranking com rosto + barra + a fonte
// (instituto · data). Sem dado real → cai no momentum modelado (subindo/caindo).
// VERSO (toque): evolução REAL das pesquisas — uma linha por candidato ao
// longo das últimas rodadas, para enxergar quem sobe e quem cai.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { compareLinesOption } from "@/components/mobile/m-chart-options";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { FONTE_COMO } from "@/lib/mobile/fonte-meta";

const AUTO_FLIP_MS = 10_000;
import { MAvatar } from "@/components/mobile/ui/m-avatar";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { getAvatar } from "@/lib/avatars";
import type { QuoteNac, QuotesNacSnapshot } from "@/lib/live-schemas";
import type { AtorNacional, Watchlist } from "@/lib/watchlist";

const COR: Record<string, string> = {
  lula: "#EA3943",
  "flavio-bolsonaro": "#3b82f6",
  "renan-santos": "#8b5cf6",
  "ronaldo-caiado": "#16C784",
  zema: "#F5A623",
};

function dirArrow(dir: QuoteNac["dir"]): { txt: string; cls: string } {
  if (dir === "up") return { txt: "▲", cls: "m-up-c" };
  if (dir === "down") return { txt: "▼", cls: "m-down-c" };
  return { txt: "▬", cls: "m-muted-c" };
}

/* ── FRENTE: ranking da corrida presidencial (intacto) ── */
function NationalFront() {
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;
  const nac = useLiveChannel<QuotesNacSnapshot>("quotes.nac").data;

  const dados = useMemo(() => {
    if (!watchlist || !nac) return null;
    const byId = new Map(nac.atores.map((a) => [a.id, a]));
    const linhas = watchlist.atores_nacionais
      .map((meta: AtorNacional) => {
        const q = byId.get(meta.id);
        return q ? { meta, quote: q } : null;
      })
      .filter((x): x is { meta: AtorNacional; quote: QuoteNac } => Boolean(x));
    const temReal = linhas.some((l) => typeof l.quote.pct === "number");
    if (temReal) linhas.sort((a, b) => (b.quote.pct ?? 0) - (a.quote.pct ?? 0));
    const max = Math.max(1, ...linhas.map((l) => l.quote.pct ?? 0));
    return { linhas, temReal, max, fonte: nac.fonte };
  }, [watchlist, nac]);

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Corrida presidencial · 2026</span>
        <FonteBadge real={dados?.temReal ?? false} como={FONTE_COMO.pesquisasPres} />
        <LiveBadge ch="quotes.nac" cadenceMs={5000} />
      </div>
      {dados ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {dados.linhas.map((l, i) => {
              const cor = COR[l.meta.id] ?? "#8a93a8";
              const pct = l.quote.pct;
              const arr = dirArrow(l.quote.dir);
              return (
                <div key={l.meta.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MAvatar src={getAvatar(l.meta.id) ?? l.meta.foto} nome={l.meta.nome} cor={cor} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 2 }}>
                      <span>
                        {dados.temReal ? (
                          <span className="m-mono m-muted-c" style={{ fontSize: 10 }}>{i + 1}º </span>
                        ) : null}
                        <span style={{ color: cor, fontWeight: 700 }}>{l.meta.nome}</span>{" "}
                        <span className="m-muted-c" style={{ fontSize: 9.5 }}>{l.meta.partido}</span>
                      </span>
                      {typeof pct === "number" ? (
                        <span className="m-mono" style={{ fontWeight: 800 }}>
                          <Odometer value={pct} decimals={0} suffix="%" />
                        </span>
                      ) : (
                        <span className={`m-mono ${arr.cls}`} style={{ fontSize: 10.5 }}>
                          {arr.txt} {l.quote.dir === "up" ? "subindo" : l.quote.dir === "down" ? "caindo" : "estável"}
                        </span>
                      )}
                    </div>
                    {typeof pct === "number" ? (
                      <div className="m-bar">
                        <span style={{ width: `${(pct / dados.max) * 100}%`, background: cor }} />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <SectionLeitura>
            {dados.temReal && dados.fonte
              ? `Intenção de voto real — fonte ${dados.fonte.instituto} (${dados.fonte.data}). ${
                  dados.linhas[0] && dados.linhas[1]
                    ? `${dados.linhas[0].meta.nome} lidera com ${(dados.linhas[0].quote.pct ?? 0).toFixed(0)}%, ${((dados.linhas[0].quote.pct ?? 0) - (dados.linhas[1].quote.pct ?? 0)).toFixed(0)} pts à frente.`
                    : ""
                }`
              : "Momentum nacional (modelado) — pesquisa real entra assim que o sidecar sincroniza."}
          </SectionLeitura>
          <div className="m-flip-hint">↻ toque para ver a evolução das pesquisas</div>
        </>
      ) : (
        <div className="m-ghost">sincronizando…</div>
      )}
    </div>
  );
}

/* ── VERSO: evolução REAL das pesquisas (uma linha por candidato) ── */
function NationalBack() {
  const nac = useLiveChannel<QuotesNacSnapshot>("quotes.nac").data;

  // Pesquisas em ordem cronológica (a snapshot vem com a mais recente primeiro).
  const polls = useMemo(() => {
    const pres = nac?.presidencial;
    if (!pres || pres.length < 2) return null;
    return [...pres].reverse();
  }, [nac]);

  const opt = useMemo(() => {
    if (!polls) return null;
    const labels = polls.map((p) => p.data);
    const candidatos = [
      { key: "lula", nome: "Lula", cor: "#EA3943" },
      { key: "flavio", nome: "Flávio", cor: "#3b82f6" },
      { key: "caiado", nome: "Caiado", cor: "#16C784" },
      { key: "zema", nome: "Zema", cor: "#F5A623" },
      { key: "renan", nome: "Renan", cor: "#8b5cf6" },
    ];
    const series = candidatos.map((c) => ({
      nome: c.nome,
      cor: c.cor,
      data: polls.map((p) => (p as Record<string, number | null | string>)[c.key] as number | null ?? 0),
    }));
    return compareLinesOption({ labels, series, normalize: false });
  }, [polls]);

  // Leitura simples: compara o primeiro vs o último valor de Lula e Flávio.
  const leitura = useMemo(() => {
    if (!polls) return null;
    const delta = (key: "lula" | "flavio") => {
      const ini = polls[0][key] ?? 0;
      const fim = polls[polls.length - 1][key] ?? 0;
      return fim - ini;
    };
    const dLula = delta("lula");
    const dFlavio = delta("flavio");
    const sinal = (d: number) =>
      d > 0.5 ? `subiu ${d.toFixed(0)} pts` : d < -0.5 ? `caiu ${Math.abs(d).toFixed(0)} pts` : "estável";
    return `Nas últimas pesquisas: Lula ${sinal(dLula)}, Flávio ${sinal(dFlavio)}.`;
  }, [polls]);

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MAvatar src={getAvatar("lula")} nome="Lula" cor="#EA3943" size={24} />
          Evolução das pesquisas
        </span>
        <LiveBadge ch="quotes.nac" cadenceMs={5000} />
      </div>
      {opt ? (
        <>
          <div data-no-swipe onClick={(e) => e.stopPropagation()}>
            <EChart option={opt} height={220} />
          </div>
          <SectionLeitura>{leitura}</SectionLeitura>
        </>
      ) : (
        <div className="m-ghost">sincronizando pesquisas…</div>
      )}
    </div>
  );
}

export function NationalActors() {
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;
  const nac = useLiveChannel<QuotesNacSnapshot>("quotes.nac").data;

  // Sem dados ainda → mesmo ghost de antes.
  if (!watchlist || !nac) {
    return (
      <div className="m-card">
        <div className="m-ghost">sincronizando…</div>
      </div>
    );
  }

  return <FlipCard autoFlipMs={AUTO_FLIP_MS} front={<NationalFront />} back={<NationalBack />} />;
}
