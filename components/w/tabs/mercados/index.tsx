"use client";

import { useMemo } from "react";

import { MarketCard } from "@/components/w/ui/market-card";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { snapshotMercados, type Cargo } from "@/lib/w/w-mock";

const CARGO_ORDER: Cargo[] = [
  "presidente",
  "governador_rj",
  "senador_rj",
  "dep_federal_rj",
];

const _LOAD_NOW = Date.now();

const CARGO_LABELS: Record<Cargo, string> = {
  presidente: "Presidente",
  governador_rj: "Governador RJ",
  senador_rj: "Senador RJ",
  dep_federal_rj: "Dep. Federal RJ",
};

export default function MercadosTab() {
  const snap = useMemo(() => snapshotMercados(_LOAD_NOW), []);

  return (
    <div className="m-tab-content">
      {CARGO_ORDER.map((cargo) => (
        <div key={cargo} className="m-card" style={{ marginBottom: 12 }}>
          <div className="m-card-head">
            <span className="m-card-title">{CARGO_LABELS[cargo]}</span>
          </div>
          <div className="m-carousel" data-no-swipe>
            {snap[cargo].map((entry) => (
              <MarketCard key={entry.candidato} entry={entry} />
            ))}
          </div>
        </div>
      ))}
      <SectionLeitura>
        Probabilidades calculadas por agregador de pesquisas (média móvel 30d + Monte Carlo).
        Arraste para ver todos os candidatos por cargo.
      </SectionLeitura>
    </div>
  );
}
