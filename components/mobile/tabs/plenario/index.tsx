"use client";

// Aba PLENÁRIO — a liderança da oposição em tempo real: placar de votação
// nominal, fidelidade da bancada do PL, traições, cabo de guerra narrativo
// e quem está falando pela oposição. Os blocos exportados são reusados na
// seção espelho do desktop (components/sections/plenario-section.tsx).
//
// Os três cards principais (placar, fidelidade, vozes) têm VERSO (toque):
//  · Placar → donut Sim/Não/Outros com total no centro + leitura da orientação.
//  · Fidelidade → gauge da fidelidade + lista das traições à orientação.
//  · Vozes → racing de quem mais fala pela oposição.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { donutOption, mGaugeOption, racingBarOption } from "@/components/mobile/m-chart-options";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import type { PlenarioState } from "@/lib/live-schemas";
import { FONTE_COMO } from "@/lib/mobile/fonte-meta";

/* ── PLACAR DE VOTAÇÃO ── */

function PlacarFront({ plenario }: { plenario: PlenarioState }) {
  const v = plenario.votacao!;
  const total = Math.max(1, v.sim + v.nao);
  const pctSim = (v.sim / total) * 100;
  const orientacaoSim = v.orientacaoPL === "Sim";

  return (
    <FlashCard watch={v.sim + v.nao}>
      <div className="m-card-head">
        <span className="m-card-title">
          <span className="m-pill vermelho" style={{ marginRight: 6 }}>
            EM VOTAÇÃO
          </span>
        </span>
        <FonteBadge real={false} />
        <LiveBadge ch="plenario" cadenceMs={1000} />
      </div>
      <div className="m-feed-title" style={{ marginBottom: 10 }}>
        {v.titulo}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="m-mono m-up-c" style={{ fontSize: 26, fontWeight: 800 }}>
          SIM <Odometer value={v.sim} />
        </span>
        <span className="m-mono m-down-c" style={{ fontSize: 26, fontWeight: 800 }}>
          <Odometer value={v.nao} /> NÃO
        </span>
      </div>
      <div className="m-bar" style={{ height: 10, marginTop: 6 }}>
        <span style={{ width: `${pctSim}%`, background: "var(--m-up)" }} />
      </div>
      <div className="m-feed-meta" style={{ justifyContent: "space-between" }}>
        <span>
          orientação PL: <b className={orientacaoSim ? "m-up-c" : "m-down-c"}>{v.orientacaoPL.toUpperCase()}</b>
        </span>
        <span>{v.outros} abst./obstr.</span>
      </div>
      <div className="m-flip-hint">↻ toque para ver o placar detalhado</div>
    </FlashCard>
  );
}

function PlacarBack({ plenario }: { plenario: PlenarioState }) {
  const v = plenario.votacao!;
  const total = v.sim + v.nao + v.outros;
  const orientacaoSim = v.orientacaoPL === "Sim";

  const option = useMemo(
    () =>
      donutOption({
        items: [
          { nome: "Sim", valor: v.sim, cor: "#16C784" },
          { nome: "Não", valor: v.nao, cor: "#EA3943" },
          { nome: "Outros", valor: v.outros, cor: "#8b92a6" },
        ],
        centro: { valor: String(total), label: "votos apurados" },
      }),
    [v.sim, v.nao, v.outros, total],
  );

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Placar detalhado</span>
        <FonteBadge real={false} />
        <LiveBadge ch="plenario" cadenceMs={1000} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={170} />
      </div>
      <SectionLeitura>
        A orientação do PL é votar <b>{v.orientacaoPL.toUpperCase()}</b>. Os {orientacaoSim ? v.sim : v.nao} votos{" "}
        {v.orientacaoPL.toLowerCase()} seguem a bancada; os {orientacaoSim ? v.nao : v.sim}{" "}
        {orientacaoSim ? "não" : "sim"} e {v.outros} abst./obstr. rompem com ela.
      </SectionLeitura>
    </div>
  );
}

export function PlacarVotacao({ plenario }: { plenario: PlenarioState }) {
  if (!plenario.votacaoAtiva || !plenario.votacao) {
    return (
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Votação nominal</span>
          <FonteBadge real={false} />
          <LiveBadge ch="plenario" cadenceMs={10000} />
        </div>
        <div className="m-ghost">plenário sem votação nominal em andamento</div>
      </div>
    );
  }

  return <FlipCard front={<PlacarFront plenario={plenario} />} back={<PlacarBack plenario={plenario} />} />;
}

/* ── FIDELIDADE DA BANCADA ── */

function FidelidadeFront({ plenario }: { plenario: PlenarioState }) {
  const f = plenario.fidelidade;
  const cor = f.pct >= 95 ? "#16C784" : f.pct >= 88 ? "#F5A623" : "#EA3943";
  const option = useMemo(
    () => mGaugeOption({ pct: f.pct, cor, label: `${f.com} de ${f.total} com a orientação` }),
    [f.pct, f.com, f.total, cor],
  );
  const traicoes = plenario.votacao?.traicoes ?? [];

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Fidelidade da bancada PL</span>
        <FonteBadge real={false} />
        <LiveBadge ch="plenario" cadenceMs={10000} />
      </div>
      <EChart option={option} height={140} />
      {traicoes.length ? (
        <div role="alert">
          {traicoes.map((t) => (
            <div className="m-feed-item" key={t.deputado_.nome}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="m-pill amarelo">TRAIU A ORIENTAÇÃO</span>
                <span className="m-feed-title">
                  {t.deputado_.nome}{" "}
                  <span className="m-muted-c">
                    ({t.deputado_.siglaPartido}-{t.deputado_.siglaUf}) votou {t.tipoVoto}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="m-feed-meta" style={{ justifyContent: "center" }}>
          nenhuma traição de voto detectada
        </div>
      )}
      <div className="m-flip-hint">↻ toque para ver fidelidade e traições</div>
    </div>
  );
}

function FidelidadeBack({ plenario }: { plenario: PlenarioState }) {
  const f = plenario.fidelidade;
  const traicoes = plenario.votacao?.traicoes ?? [];
  const option = useMemo(
    () => mGaugeOption({ pct: f.pct, label: "fidelidade à orientação", cor: "#16C784" }),
    [f.pct],
  );

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Disciplina da bancada</span>
        <FonteBadge real={false} />
        <LiveBadge ch="plenario" cadenceMs={10000} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={150} />
      </div>
      {traicoes.length ? (
        <div role="alert" style={{ marginTop: 4 }}>
          <div style={{ color: "#EA3943", fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
            ROMPERAM COM A ORIENTAÇÃO ▼
          </div>
          {traicoes.map((t) => (
            <div
              key={t.deputado_.nome}
              style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0" }}
            >
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.deputado_.nome}{" "}
                <span className="m-muted-c" style={{ fontSize: 9.5 }}>
                  ({t.deputado_.siglaPartido}-{t.deputado_.siglaUf})
                </span>
              </span>
              <span className="m-mono m-down-c" style={{ fontWeight: 700 }}>
                votou {t.tipoVoto}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <SectionLeitura>
        {traicoes.length
          ? `${f.com} de ${f.total} deputados (${f.pct.toFixed(1)}%) seguiram a orientação; ${traicoes.length} ${
              traicoes.length === 1 ? "rompeu" : "romperam"
            } — cobre os nomes acima.`
          : `${f.com} de ${f.total} deputados (${f.pct.toFixed(1)}%) seguiram a orientação. Bancada coesa, sem traições.`}
      </SectionLeitura>
    </div>
  );
}

export function FidelidadeBancada({ plenario }: { plenario: PlenarioState }) {
  return <FlipCard front={<FidelidadeFront plenario={plenario} />} back={<FidelidadeBack plenario={plenario} />} />;
}

/* ── CABO DE GUERRA (sem verso) ── */

export function CaboDeGuerra({ plenario }: { plenario: PlenarioState }) {
  const c = plenario.caboDeGuerra;
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Cabo de guerra narrativo · hoje</span>
        <FonteBadge real={false} />
        <span className="m-mono m-muted-c" style={{ fontSize: 10 }}>
          share of voice
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 6 }}>
        <span className="m-up-c" style={{ fontWeight: 700 }}>
          OPOSIÇÃO · {c.temaOposicao}
        </span>
        <span className="m-down-c" style={{ fontWeight: 700, textAlign: "right" }}>
          {c.temaGoverno} · GOVERNO
        </span>
      </div>
      <div className="m-bar" style={{ height: 14, background: "var(--m-down)" }}>
        <span style={{ width: `${c.shareOposicao}%`, background: "var(--m-up)", borderRadius: "3px 0 0 3px" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span className="m-mono m-up-c" style={{ fontSize: 13, fontWeight: 800 }}>
          <Odometer value={c.shareOposicao} decimals={1} suffix="%" />
        </span>
        <span className="m-mono m-down-c" style={{ fontSize: 13, fontWeight: 800 }}>
          <Odometer value={100 - c.shareOposicao} decimals={1} suffix="%" />
        </span>
      </div>
    </div>
  );
}

/* ── VOZES DA OPOSIÇÃO ── */

function VozFront({ plenario }: { plenario: PlenarioState }) {
  const option = useMemo(
    () =>
      racingBarOption({
        items: plenario.vozes.map((v, i) => ({
          nome: `${v.nome} (${v.partido})`,
          valor: v.mencoes,
          cor: i === 0 ? "#16C784" : "#3b82f6",
        })),
      }),
    [plenario.vozes],
  );
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Quem fala pela oposição · 6h</span>
        <FonteBadge real={false} />
        <LiveBadge ch="plenario" cadenceMs={10000} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={170} />
      </div>
      <div className="m-flip-hint">↻ toque para ver o ranking de vozes</div>
    </div>
  );
}

function VozBack({ plenario }: { plenario: PlenarioState }) {
  const ord = useMemo(() => [...plenario.vozes].sort((a, b) => b.mencoes - a.mencoes), [plenario.vozes]);
  const option = useMemo(
    () => racingBarOption({ items: ord.map((v) => ({ nome: `${v.nome} (${v.partido})`, valor: v.mencoes })) }),
    [ord],
  );
  const top = ord[0];

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Ranking de vozes · oposição</span>
        <FonteBadge real={false} />
        <LiveBadge ch="plenario" cadenceMs={10000} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={Math.max(160, ord.length * 26)} />
      </div>
      <SectionLeitura>
        {top
          ? `${top.nome} (${top.partido}) puxa a narrativa com ${top.mencoes} menções nas últimas 6h — amplifique quem fala mais pela oposição.`
          : "Sem vozes registradas pela oposição nas últimas 6h."}
      </SectionLeitura>
    </div>
  );
}

export function RacingVoz({ plenario }: { plenario: PlenarioState }) {
  return <FlipCard front={<VozFront plenario={plenario} />} back={<VozBack plenario={plenario} />} />;
}

export default function PlenarioTab() {
  const plenario = useLiveChannel<PlenarioState>("plenario").data;

  if (!plenario) {
    return <div className="m-ghost">sincronizando com o plenário…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <FonteBadge
          real={plenario.fonte === "real"}
          como={FONTE_COMO.plenario}
        />
      </div>
      <PlacarVotacao plenario={plenario} />
      <FidelidadeBancada plenario={plenario} />
      <CaboDeGuerra plenario={plenario} />
      <RacingVoz plenario={plenario} />
    </div>
  );
}
