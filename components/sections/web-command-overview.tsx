"use client";

import { useEffect, useMemo, useState } from "react";

import { getDashboardKpis } from "@/lib/mock/campaign-metrics";
import { META_ELEITORES } from "@/lib/mock/campaign-goal";
import type { RegionId } from "@/lib/mock/types";

type SectionId = string;

// Ícones inline (stroke currentColor) — não dependem do CDN do lucide.
function LaunchIcon({ name }: { name: string }) {
  const p: Record<string, React.ReactNode> = {
    monitor: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
    phone: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="3" />
        <path d="M11 18h2" />
      </>
    ),
    vote: (
      <>
        <path d="M3 21h18M5 21V10M10 21V6M15 21v-8M20 21V8" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
      </>
    ),
  };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {p[name]}
    </svg>
  );
}

type Launch = { title: string; sub: string; icon: string; accent: string; href?: string; section?: SectionId };
const LAUNCHERS: Launch[] = [
  { title: "Telão — Sala de Guerra", sub: "NOC ao vivo · tela cheia", icon: "monitor", accent: "#16C784", href: "/telao" },
  { title: "Cockpit Mobile", sub: "painel de bolso", icon: "phone", accent: "#A855F7", href: "/m" },
  { title: "Eleições 2026", sub: "agregador nacional", icon: "vote", accent: "#3B82F6", href: "/w" },
  { title: "Cadastro da Rede", sub: "QR · cabos · eleitores", icon: "users", accent: "#F5A623", section: "organizadores" },
];

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
      <style>{`
        .web-launch { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
        .web-launch-card {
          display:flex; align-items:center; gap:12px; padding:12px 16px;
          background:var(--cinza-card,#1e1e28); border:1px solid var(--cinza-borda,#2a2a38);
          border-left:3px solid var(--lc,#16C784); border-radius:12px;
          color:var(--branco,#f0f0f0); text-decoration:none; cursor:pointer;
          flex:1 1 200px; min-width:200px; text-align:left; font-family:inherit;
          transition:transform .12s ease, border-color .12s ease, background .12s ease;
        }
        .web-launch-card:hover { transform:translateY(-2px); background:#23232f; border-color:var(--lc,#16C784); }
        .web-launch-ic { width:42px; height:42px; border-radius:10px; display:grid; place-items:center;
          background:color-mix(in srgb, var(--lc) 16%, transparent); color:var(--lc,#16C784); flex:none; }
        .web-launch-tx { display:flex; flex-direction:column; gap:2px; min-width:0; }
        .web-launch-tt { font-size:14px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .web-launch-sb { font-size:11px; color:var(--texto-sec,#8a8aaa); }
        .web-launch-go { margin-left:auto; color:var(--texto-sec,#8a8aaa); font-size:16px; }
      `}</style>
      <div className="web-command-overview-head">
        <h3>Telas ao vivo</h3>
        <p>Abra os painéis em tela cheia ou vá direto ao cadastro da rede.</p>
      </div>
      <div className="web-launch">
        {LAUNCHERS.map((l) => {
          const inner = (
            <>
              <span className="web-launch-ic">
                <LaunchIcon name={l.icon} />
              </span>
              <span className="web-launch-tx">
                <span className="web-launch-tt">{l.title}</span>
                <span className="web-launch-sb">{l.sub}</span>
              </span>
              <span className="web-launch-go">{l.href ? "↗" : "→"}</span>
            </>
          );
          return l.href ? (
            <a
              key={l.title}
              className="web-launch-card"
              style={{ ["--lc" as string]: l.accent }}
              href={l.href}
              target="_blank"
              rel="noreferrer"
            >
              {inner}
            </a>
          ) : (
            <button
              key={l.title}
              type="button"
              className="web-launch-card"
              style={{ ["--lc" as string]: l.accent }}
              onClick={() => l.section && onNavigate(l.section)}
            >
              {inner}
            </button>
          );
        })}
      </div>
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
