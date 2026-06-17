"use client";

import { useEffect, useMemo, useState } from "react";

import { getDashboardKpis } from "@/lib/mock/campaign-metrics";
import { META_ELEITORES } from "@/lib/mock/campaign-goal";
import type { RegionId } from "@/lib/mock/types";

type SectionId = string;

const CARDS: {
  id: SectionId;
  title: string;
  subtitle: string;
  accent: string;
  section: SectionId;
}[] = [
  {
    id: "idx",
    title: "SENTIMENTO",
    subtitle: "Sentimento do candidato",
    accent: "#16C784",
    section: "noc",
  },
  {
    id: "meta",
    title: "Cadastro",
    subtitle: "Meta de eleitores",
    accent: "#F5A623",
    section: "meta",
  },
  {
    id: "rivais",
    title: "Concorrentes",
    subtitle: "RJ em disputa",
    accent: "#3B82F6",
    section: "concorrentes",
  },
  {
    id: "redes",
    title: "Redes",
    subtitle: "Ranking e engajamento",
    accent: "#A855F7",
    section: "social",
  },
  {
    id: "plenario",
    title: "Plenário",
    subtitle: "Votações e placar",
    accent: "#22D3EE",
    section: "plenario",
  },
];

export function WebCommandOverview({
  region,
  onNavigate,
}: {
  region: RegionId;
  onNavigate: (section: SectionId) => void;
}) {
  const kpis = useMemo(() => getDashboardKpis(region), [region]);

  // Sentimento atual real do candidato (net = índice − 100, em %).
  const [sentNet, setSentNet] = useState<number | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch("/api/sentimento", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (vivo && typeof d?.net === "number") setSentNet(d.net);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);
  const sentLabel =
    sentNet == null ? "—" : `${sentNet > 0 ? "+" : sentNet < 0 ? "−" : ""}${Math.abs(sentNet)}%`;

  const values: Record<string, { value: string; hint: string }> = {
    idx: { value: sentLabel, hint: "(menções pos − neg) ÷ total" },
    meta: {
      value: `${Math.round(META_ELEITORES * 0.76).toLocaleString("pt-BR")}`,
      hint: `meta ${META_ELEITORES.toLocaleString("pt-BR")}`,
    },
    rivais: { value: "#4", hint: "posição no RJ" },
    redes: {
      value: `${kpis.find((k) => k.label.includes("Aprovação"))?.valor ?? "62%"}`,
      hint: "sentimento positivo",
    },
    plenario: { value: "AO VIVO", hint: "monitor legislativo" },
  };

  return (
    <section className="web-command-overview" aria-label="Visão operacional">
      <div className="web-command-overview-head">
        <h3>Prioridades do dia</h3>
        <p>Atalhos para as mesmas frentes do ticker mobile. Clique para abrir a seção completa abaixo.</p>
      </div>
      <div className="web-command-grid">
        {CARDS.map((card) => {
          const data = values[card.id];
          return (
            <button
              key={card.id}
              type="button"
              className="web-command-card"
              style={{ ["--accent" as string]: card.accent }}
              onClick={() => onNavigate(card.section)}
            >
              <span className="web-command-card-kicker">{card.subtitle}</span>
              <strong className="web-command-card-title">{card.title}</strong>
              <span className="web-command-card-value">{data.value}</span>
              <span className="web-command-card-hint">{data.hint}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
