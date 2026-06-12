"use client";

// Resumo da máquina de campo na página 1. FRENTE: líderes/cabos/eleitores,
// melhor e pior região. VERSO (toque): ranking com ROSTOS (racing animado) +
// quem está PUXANDO (▲ verde) e quem é LANTERNA (▼ vermelho) — para o candidato
// reconhecer os bons e cobrar/ajudar os ruins.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { avatarRacingOption } from "@/components/mobile/m-chart-options";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LeituraIA } from "@/components/mobile/ui/leitura-ia";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { avatarForChart } from "@/components/mobile/ui/m-avatar";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { getAvatar } from "@/lib/avatars";
import type { EquipeSnapshot } from "@/lib/live-schemas";

const NIVEL_COR: Record<string, string> = {
  "church-leader": "#8b5cf6",
  "regional-manager": "#3b82f6",
  "state-deputy": "#f0c030",
  cabo: "#22c55e",
};
const corDoNivel = (n: string) => NIVEL_COR[n] ?? "#16C784";
const nome2 = (n: string) => n.split(" ").slice(0, 2).join(" ");

type RankItem = EquipeSnapshot["ranking"][number];

/* ── FRENTE ── */
function ResumoFront({ equipe }: { equipe: EquipeSnapshot }) {
  const lideres = equipe.tiers
    .filter((t) => t.nivel !== "cabo" && t.nivel !== "eleitor")
    .reduce((s, t) => s + t.count, 0);
  const cabos = equipe.tiers.find((t) => t.nivel === "cabo")?.count ?? 0;
  const eleitores = equipe.tiers.find((t) => t.nivel === "eleitor")?.count ?? 0;
  const ord = [...equipe.porRegiao].sort((a, b) => b.pct - a.pct);
  const melhor = ord[0];
  const pior = ord[ord.length - 1];

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Equipe de campo</span>
        <LeituraIA
          card="ticker-equipe-resumo"
          contexto={`cad ${equipe.geral.cadastrados}/${equipe.geral.meta}; líderes ${lideres}; cabos ${cabos}; melhor ${melhor?.nome} ${melhor?.pct.toFixed(0)}%; pior ${pior?.nome} ${pior?.pct.toFixed(0)}%`}
          titulo="Equipe de campo"
        />
        <FonteBadge real={false} />
        <LiveBadge ch="equipe" cadenceMs={2000} />
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "2px 0 6px" }}>
        <Num label="líderes" valor={lideres} />
        <Num label="cabos" valor={cabos} />
        <Num label="eleitores" valor={eleitores} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {melhor ? <Regiao nome={melhor.nome} pct={melhor.pct} cor="#16C784" rotulo="melhor região" /> : null}
        {pior && pior !== melhor ? <Regiao nome={pior.nome} pct={pior.pct} cor="#EA3943" rotulo="atenção" /> : null}
      </div>
      <div className="m-flip-hint">↻ toque para ver quem puxa e quem precisa de ajuda</div>
    </div>
  );
}

/* ── VERSO ── */
function ResumoBack({ equipe }: { equipe: EquipeSnapshot }) {
  const racing = useMemo(() => {
    const top = equipe.ranking.slice(0, 8);
    return avatarRacingOption({
      items: top.map((l) => {
        const cor = corDoNivel(l.nivel);
        return { nome: nome2(l.nome), valor: l.atingimentoPct, cor, img: avatarForChart(getAvatar(l.nivel), l.nome, cor) };
      }),
      suffix: "%",
    });
  }, [equipe.ranking]);

  const puxando = equipe.ranking.slice(0, 3);
  const lanternas = (equipe.lanternas ?? []).slice(0, 3);

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Quem puxa · quem precisa de ajuda</span>
      </div>
      <div data-no-swipe>
        <EChart option={racing} height={170} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
        <div>
          <div style={{ color: "#16C784", fontSize: 11, fontWeight: 800, marginBottom: 2 }}>PUXANDO ▲</div>
          {puxando.map((l) => <Linha key={l.nome} l={l} cls="m-up-c" arrow="▲" />)}
        </div>
        <div>
          <div style={{ color: "#EA3943", fontSize: 11, fontWeight: 800, marginBottom: 2 }}>PRECISA AGIR ▼</div>
          {lanternas.map((l) => <Linha key={l.nome} l={l} cls="m-down-c" arrow="▼" />)}
        </div>
      </div>
      <SectionLeitura>
        {lanternas[0]
          ? `Reconheça ${nome2(puxando[0]?.nome ?? "")} (${puxando[0]?.atingimentoPct.toFixed(0)}%) e cobre ${nome2(lanternas[0].nome)} em ${lanternas[0].regiao} (${lanternas[0].atingimentoPct.toFixed(0)}% da meta).`
          : "Acompanhe o ranking para reconhecer os melhores e ajudar os atrasados."}
      </SectionLeitura>
    </div>
  );
}

function Linha({ l, cls, arrow }: { l: RankItem; cls: string; arrow: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, padding: "1px 0" }}>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {nome2(l.nome)}
      </span>
      <span className={`m-mono ${cls}`} style={{ fontWeight: 700 }}>
        {arrow} {l.atingimentoPct.toFixed(0)}%
      </span>
    </div>
  );
}

export function EquipeResumo() {
  const equipe = useLiveChannel<EquipeSnapshot>("equipe").data;
  if (!equipe) {
    return (
      <div className="m-card">
        <div className="m-ghost">sincronizando equipe…</div>
      </div>
    );
  }
  return (
    <FlipCard front={<ResumoFront equipe={equipe} />} back={<ResumoBack equipe={equipe} />} />
  );
}

function Num({ label, valor }: { label: string; valor: number }) {
  return (
    <div>
      <div className="m-mono" style={{ fontSize: 18, fontWeight: 800 }}>
        <Odometer value={valor} />
      </div>
      <div className="m-muted-c" style={{ fontSize: 9.5, letterSpacing: "0.04em" }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}

function Regiao({ nome, pct, cor, rotulo }: { nome: string; pct: number; cor: string; rotulo: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
        <span>
          <span style={{ color: cor, fontWeight: 700 }}>{nome}</span>{" "}
          <span className="m-muted-c" style={{ fontSize: 9.5 }}>· {rotulo}</span>
        </span>
        <span className="m-mono">{pct.toFixed(0)}% da meta</span>
      </div>
      <div className="m-bar">
        <span style={{ width: `${Math.min(100, pct)}%`, background: cor }} />
      </div>
    </div>
  );
}
