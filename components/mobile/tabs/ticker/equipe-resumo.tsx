"use client";

// Resumo da máquina de campo na página 1 — os principais números da aba equipe
// num card só: líderes/cabos/eleitores, melhor e pior região, e o líder nº 1.

import { useMemo } from "react";

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import type { EquipeSnapshot } from "@/lib/live-schemas";

export function EquipeResumo() {
  const equipe = useLiveChannel<EquipeSnapshot>("equipe").data;

  const r = useMemo(() => {
    if (!equipe) return null;
    const lideres = equipe.tiers
      .filter((t) => t.nivel !== "cabo" && t.nivel !== "eleitor")
      .reduce((s, t) => s + t.count, 0);
    const cabos = equipe.tiers.find((t) => t.nivel === "cabo")?.count ?? 0;
    const eleitores = equipe.tiers.find((t) => t.nivel === "eleitor")?.count ?? 0;
    const ord = [...equipe.porRegiao].sort((a, b) => b.pct - a.pct);
    return { lideres, cabos, eleitores, melhor: ord[0], pior: ord[ord.length - 1], lider: equipe.ranking[0] };
  }, [equipe]);

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Equipe de campo</span>
        <LiveBadge ch="equipe" cadenceMs={2000} />
      </div>
      {r ? (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "2px 0 6px" }}>
            <Num label="líderes" valor={r.lideres} />
            <Num label="cabos" valor={r.cabos} />
            <Num label="eleitores" valor={r.eleitores} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {r.melhor ? (
              <Regiao nome={r.melhor.nome} pct={r.melhor.pct} cor="#16C784" rotulo="melhor região" />
            ) : null}
            {r.pior && r.pior !== r.melhor ? (
              <Regiao nome={r.pior.nome} pct={r.pior.pct} cor="#EA3943" rotulo="atenção" />
            ) : null}
          </div>
          <SectionLeitura>
            {r.lider
              ? `Líder nº 1: ${r.lider.nome} (${r.lider.regiao}) — ${r.lider.atingimentoPct.toFixed(0)}% da meta. ${r.pior ? `Reforce o campo em ${r.pior.nome} (${r.pior.pct.toFixed(0)}%).` : ""}`
              : "Sem ranking para exibir."}
          </SectionLeitura>
        </>
      ) : (
        <div className="m-ghost">sincronizando equipe…</div>
      )}
    </div>
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
