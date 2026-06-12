"use client";

// Aba 2026 — a régua: poll of polls presidencial com bandas de confiança,
// projeção de bancada do PL no RJ (lib/quociente.ts), radar PesqEle,
// odômetros Polymarket e aprovação/desaprovação divergente.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { divergingBarsOption, pollBandsOption } from "@/components/mobile/m-chart-options";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LeituraIA } from "@/components/mobile/ui/leitura-ia";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import type { C2026State } from "@/lib/live-schemas";

function PollOfPolls({ c }: { c: C2026State }) {
  const option = useMemo(() => pollBandsOption(c.pollOfPolls), [c.pollOfPolls]);
  const top = [...c.pollOfPolls.series].sort(
    (a, b) => (b.media[b.media.length - 1] ?? 0) - (a.media[a.media.length - 1] ?? 0),
  )[0];
  const topPct = top?.media[top.media.length - 1];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Poll of polls · presidencial</span>
        <LeituraIA
          card="c2026-poll-of-polls"
          contexto={`${c.pollOfPolls.series.length} candidatos; top ${top?.nome.split(" ")[0] ?? "?"} ${topPct?.toFixed(1) ?? "?"}%`}
          titulo="Poll of polls · presidencial"
        />
        <FonteBadge real={false} />
        <LiveBadge ch="c2026" cadenceMs={30000} />
      </div>
      <div data-no-swipe>
        <EChart option={option} height={210} />
      </div>
      <div className="m-feed-meta">
        <span>média das pesquisas com banda de confiança · faixa = incerteza entre institutos</span>
      </div>
    </div>
  );
}

function BancadaPl({ c }: { c: C2026State }) {
  const b = c.bancada;
  return (
    <FlashCard watch={b.votosLegendaPL}>
      <div className="m-card-head">
        <span className="m-card-title">Projeção de bancada · PL federal RJ</span>
        <LeituraIA
          card="c2026-bancada"
          contexto={`PL ${b.faixa[0]}-${b.faixa[1]} fed; quoc ${b.quociente.toLocaleString("pt-BR")}; leg ${b.votosLegendaPL}; pos ${b.posicaoLista}º`}
          titulo="Projeção de bancada · PL"
        />
        <FonteBadge real={false} />
        <LiveBadge ch="c2026" cadenceMs={30000} />
      </div>
      <div className="m-headline-num" style={{ fontSize: "clamp(34px, 11vw, 48px)" }}>
        PL elege{" "}
        <span className="m-up-c">
          <Odometer value={b.faixa[0]} />–<Odometer value={b.faixa[1]} />
        </span>{" "}
        federais
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        <span className="m-pill">
          quociente <b className="m-mono">{b.quociente.toLocaleString("pt-BR")}</b>
        </span>
        <span className="m-pill">
          legenda PL <Odometer value={b.votosLegendaPL} />
        </span>
        <span className="m-pill up">
          cenário base: <b className="m-mono">{b.base}</b> cadeiras
        </span>
        <span className="m-pill amarelo">
          posição provável na lista: <b className="m-mono">{b.posicaoLista}º</b>
        </span>
      </div>
      <div className="m-feed-meta">
        <span>quociente e bancada via lib/quociente.ts — a mesma matemática da calculadora do cockpit</span>
      </div>
    </FlashCard>
  );
}

function PesqEleRadar({ c }: { c: C2026State }) {
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Radar PesqEle</span>
        <LeituraIA
          card="c2026-pesqele"
          contexto={`${c.pesqEle.diasRestantes} dias até ${c.pesqEle.proximaJanela}`}
          titulo="Radar PesqEle"
        />
        <FonteBadge real={false} />
        <LiveBadge ch="c2026" cadenceMs={30000} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className="m-headline-num" style={{ fontSize: 40 }}>
          <Odometer value={c.pesqEle.diasRestantes} />
        </span>
        <span className="m-muted-c" style={{ fontSize: 12 }}>
          dias até {c.pesqEle.proximaJanela}
        </span>
      </div>
    </div>
  );
}

function Polymarket({ c }: { c: C2026State }) {
  const top = [...c.polymarket].sort((a, b) => b.prob - a.prob)[0];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Mercados · Polymarket</span>
        <LeituraIA
          card="c2026-polymarket"
          contexto={`${c.polymarket.length} mercados; top ${top?.mercado ?? "?"} ${top?.prob.toFixed(1) ?? "?"}%`}
          titulo="Mercados · Polymarket"
        />
        <FonteBadge real={false} />
        <LiveBadge ch="c2026" cadenceMs={30000} />
      </div>
      {c.polymarket.map((m) => (
        <div className="m-row" key={m.mercado}>
          <span style={{ fontSize: 12.5 }}>{m.mercado}</span>
          <span className={`m-mono ${m.prob >= 50 ? "m-up-c" : "m-warn-c"}`} style={{ fontSize: 16, fontWeight: 800 }}>
            <Odometer value={m.prob} decimals={1} suffix="%" />
          </span>
        </div>
      ))}
    </div>
  );
}

function Aprovacao({ c }: { c: C2026State }) {
  const option = useMemo(() => divergingBarsOption(c.aprovacao.segmentos), [c.aprovacao.segmentos]);
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Aprovação do governo · por segmento</span>
        <LeituraIA
          card="c2026-aprovacao"
          contexto={`aprova ${c.aprovacao.aprova.toFixed(1)}%; desaprova ${c.aprovacao.desaprova.toFixed(1)}%; ${c.aprovacao.segmentos.length} segmentos`}
          titulo="Aprovação do governo"
        />
        <FonteBadge real={false} />
        <LiveBadge ch="c2026" cadenceMs={30000} />
      </div>
      <div style={{ display: "flex", gap: 14, marginBottom: 6 }}>
        <span className="m-mono m-up-c" style={{ fontSize: 15, fontWeight: 800 }}>
          aprova <Odometer value={c.aprovacao.aprova} decimals={1} suffix="%" />
        </span>
        <span className="m-mono m-down-c" style={{ fontSize: 15, fontWeight: 800 }}>
          desaprova <Odometer value={c.aprovacao.desaprova} decimals={1} suffix="%" />
        </span>
      </div>
      <div data-no-swipe>
        <EChart option={option} height={150} />
      </div>
    </div>
  );
}

export default function C2026Tab() {
  const c2026 = useLiveChannel<C2026State>("c2026").data;
  if (!c2026) return <div className="m-ghost">sincronizando com 2026…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <BancadaPl c={c2026} />
      <PollOfPolls c={c2026} />
      <PesqEleRadar c={c2026} />
      <Polymarket c={c2026} />
      <Aprovacao c={c2026} />
    </div>
  );
}
