"use client";

import { useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { donutOption, mGaugeOption, racingBarOption } from "@/components/mobile/m-chart-options";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LeituraIA } from "@/components/mobile/ui/leitura-ia";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import type { PlenarioState, Votacao } from "@/lib/live-schemas";
import { FONTE_COMO } from "@/lib/mobile/fonte-meta";

function votoCor(voto: string): string {
  if (/^sim$/i.test(voto)) return "var(--m-up)";
  if (/^n[aã]o$/i.test(voto)) return "var(--m-down)";
  return "var(--m-muted)";
}

/* ── PLACAR DE VOTAÇÃO ── */

function PlacarFront({
  plenario,
  v,
  aoVivo,
}: {
  plenario: PlenarioState;
  v: Votacao;
  aoVivo: boolean;
}) {
  const total = Math.max(1, v.sim + v.nao);
  const pctSim = (v.sim / total) * 100;
  const orientacaoSim = v.orientacaoPL === "Sim";
  const real = plenario.fonte === "real";

  return (
    <FlashCard watch={v.sim + v.nao}>
      <div className="m-card-head">
        <span className="m-card-title">
          <span className={`m-pill ${aoVivo ? "vermelho" : "azul"}`} style={{ marginRight: 6 }}>
            {aoVivo ? "EM VOTAÇÃO" : "ÚLTIMA VOTAÇÃO"}
          </span>
          {v.orgao ? (
            <span className="m-pill" style={{ marginRight: 6, background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
              {v.orgao}
            </span>
          ) : null}
        </span>
        <LeituraIA
          card="plenario-placar"
          contexto={`${v.orgao ?? "PLEN"} SIM ${v.sim} NÃO ${v.nao}; orient PL ${v.orientacaoPL}`}
          titulo={aoVivo ? "Placar de votação" : "Última votação"}
        />
        <FonteBadge real={real} como={FONTE_COMO.plenario} />
        <LiveBadge ch="plenario" cadenceMs={aoVivo ? 1000 : 10000} />
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

function PlacarBack({ plenario, v }: { plenario: PlenarioState; v: Votacao }) {
  const total = v.sim + v.nao + v.outros;
  const orientacaoSim = v.orientacaoPL === "Sim";
  const real = plenario.fonte === "real";

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
        <FonteBadge real={real} como={FONTE_COMO.plenario} />
        <LiveBadge ch="plenario" cadenceMs={10000} />
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
  const v = plenario.votacaoAtiva && plenario.votacao ? plenario.votacao : plenario.votacaoRecente;
  const aoVivo = Boolean(plenario.votacaoAtiva && plenario.votacao);

  if (!v) {
    return (
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Votação nominal</span>
          <LeituraIA card="plenario-placar-idle" contexto="sem votação nominal em andamento" titulo="Votação nominal" />
          <FonteBadge real={plenario.fonte === "real"} como={FONTE_COMO.plenario} />
          <LiveBadge ch="plenario" cadenceMs={10000} />
        </div>
        <div className="m-ghost">carregando histórico de votações…</div>
      </div>
    );
  }

  return (
    <FlipCard
      front={<PlacarFront plenario={plenario} v={v} aoVivo={aoVivo} />}
      back={<PlacarBack plenario={plenario} v={v} />}
    />
  );
}

/* ── FIDELIDADE DA BANCADA ── */

function FidelidadeFront({ plenario }: { plenario: PlenarioState }) {
  const f = plenario.fidelidade;
  const cor = f.pct >= 95 ? "#16C784" : f.pct >= 88 ? "#F5A623" : "#EA3943";
  const option = useMemo(
    () => mGaugeOption({ pct: f.pct, cor, label: `${f.com} de ${f.total} com a orientação` }),
    [f.pct, f.com, f.total, cor],
  );
  const traicoes = (plenario.votacao ?? plenario.votacaoRecente)?.traicoes ?? [];
  const real = plenario.fonte === "real";

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Fidelidade da bancada PL</span>
        <LeituraIA
          card="plenario-fidelidade"
          contexto={`${f.pct.toFixed(1)}% fidelidade; ${f.com}/${f.total}; ${traicoes.length} traições`}
          titulo="Fidelidade da bancada PL"
        />
        <FonteBadge real={real} como={FONTE_COMO.plenario} />
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
  const traicoes = (plenario.votacao ?? plenario.votacaoRecente)?.traicoes ?? [];
  const real = plenario.fonte === "real";
  const option = useMemo(
    () => mGaugeOption({ pct: f.pct, label: "fidelidade à orientação", cor: "#16C784" }),
    [f.pct],
  );

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Disciplina da bancada</span>
        <FonteBadge real={real} como={FONTE_COMO.plenario} />
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
        <LeituraIA
          card="plenario-cabo-guerra"
          contexto={`oposição ${c.shareOposicao.toFixed(1)}% ${c.temaOposicao}; governo ${(100 - c.shareOposicao).toFixed(1)}% ${c.temaGoverno}`}
          titulo="Cabo de guerra narrativo"
        />
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
  const top = plenario.vozes[0];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Quem fala pela oposição · 6h</span>
        <LeituraIA
          card="plenario-vozes"
          contexto={`${plenario.vozes.length} vozes; top ${top?.nome ?? "?"} ${top?.mencoes ?? 0} menções`}
          titulo="Quem fala pela oposição"
        />
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

/* ── HISTÓRICO MULTI-ÓRGÃO (PLEN, CCJC, comissões) ── */

export function HistoricoVotacoes({ plenario }: { plenario: PlenarioState }) {
  const [filtro, setFiltro] = useState<string>("TODOS");
  const historico = useMemo(() => plenario.historico ?? [], [plenario.historico]);
  const orgaos = plenario.orgaosMonitorados ?? [];
  const real = plenario.fonte === "real";

  const filtrado = useMemo(() => {
    if (filtro === "TODOS") return historico;
    return historico.filter((h) => h.orgao === filtro);
  }, [historico, filtro]);

  if (!historico.length) return null;

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Histórico · Plenário e comissões</span>
        <LeituraIA
          card="plenario-historico"
          contexto={`${historico.length} votações; órgãos ${orgaos.map((o) => o.sigla).join(", ")}`}
          titulo="Histórico de votações"
        />
        <FonteBadge real={real} como={FONTE_COMO.plenarioHistorico} />
        <LiveBadge ch="plenario" cadenceMs={60000} />
      </div>
      <div className="m-carousel" data-no-swipe style={{ marginBottom: 8, gap: 6, flexWrap: "wrap" }}>
        {["TODOS", ...orgaos.map((o) => o.sigla)].map((sigla) => (
          <button
            key={sigla}
            type="button"
            onClick={() => setFiltro(sigla)}
            className="m-pill"
            style={{
              cursor: "pointer",
              border: "none",
              opacity: filtro === sigla ? 1 : 0.55,
              background: filtro === sigla ? "rgba(96,165,250,0.25)" : "rgba(255,255,255,0.06)",
            }}
          >
            {sigla === "TODOS" ? "Todos" : sigla}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
        {filtrado.slice(0, 20).map((h) => (
          <div className="m-feed-item" key={h.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
              <span className="m-pill" style={{ fontSize: 9, background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>
                {h.orgao}
              </span>
              <span className="m-muted-c" style={{ fontSize: 10 }}>
                {h.data}
              </span>
            </div>
            <div className="m-feed-title" style={{ fontSize: 11.5, lineHeight: 1.35 }}>
              {h.titulo}
            </div>
            <div className="m-feed-meta" style={{ justifyContent: "space-between", marginTop: 4 }}>
              <span className="m-mono" style={{ fontSize: 10 }}>
                <span className="m-up-c">Sim {h.sim}</span>
                {" · "}
                <span className="m-down-c">Não {h.nao}</span>
                {h.outros ? ` · ${h.outros} outr.` : ""}
              </span>
              {h.votoSostenes ? (
                <span className="m-mono" style={{ fontSize: 10, color: votoCor(h.votoSostenes), fontWeight: 700 }}>
                  Sóstenes: {h.votoSostenes}
                </span>
              ) : (
                <span className="m-muted-c" style={{ fontSize: 9.5 }}>
                  {h.temNominal ? "sem voto nominal" : "simbólica"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── VOTOS DO DEPUTADO (178947) ── */

export function VotosSostenes({ plenario }: { plenario: PlenarioState }) {
  const votos = plenario.votosDeputado ?? [];
  const real = plenario.fonte === "real";

  if (!votos.length) return null;

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Votos de Sóstenes · nominais</span>
        <LeituraIA
          card="plenario-votos-dep"
          contexto={`${votos.length} votações nominais recentes do dep. 178947`}
          titulo="Votos do deputado"
        />
        <FonteBadge real={real} como={FONTE_COMO.plenarioVotosDep} />
        <LiveBadge ch="plenario" cadenceMs={60000} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
        {votos.map((v) => (
          <div className="m-feed-item" key={`${v.idVotacao}-${v.data}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span className="m-pill" style={{ fontSize: 9 }}>
                {v.orgao}
              </span>
              <span className="m-mono" style={{ fontSize: 12, fontWeight: 800, color: votoCor(v.voto) }}>
                {v.voto}
              </span>
            </div>
            <div className="m-feed-title" style={{ fontSize: 11.5, marginTop: 4 }}>
              {v.titulo}
            </div>
            <div className="m-muted-c" style={{ fontSize: 9.5, marginTop: 2 }}>
              {v.data}
            </div>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Votações nominais do dep. Sóstenes Cavalcante (PL-RJ) no ano corrente. Comissões como CCJC aparecem no
        histórico geral; voto nominal do deputado só quando ele participou da votação nominal.
      </SectionLeitura>
    </div>
  );
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
      <HistoricoVotacoes plenario={plenario} />
      <VotosSostenes plenario={plenario} />
      <CaboDeGuerra plenario={plenario} />
      <RacingVoz plenario={plenario} />
    </div>
  );
}
