"use client";

// Feed de alertas — spikes, votações e menções, com nível amarelo/vermelho.
// FRENTE: lista dos últimos alertas. VERSO (toque): donut com a quebra dos
// alertas POR TIPO (picos, votações, traições, imprensa, crise de redes).

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { donutOption } from "@/components/mobile/m-chart-options";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LeituraIA } from "@/components/mobile/ui/leitura-ia";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { FONTE_COMO } from "@/lib/mobile/fonte-meta";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import type { AlertsSnapshot } from "@/lib/live-schemas";

function hora(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Mapa tipo → rótulo/cor para o donut do verso.
const TIPO_META: Record<string, { label: string; cor: string }> = {
  spike: { label: "Picos", cor: "#F5A623" },
  votacao_iniciada: { label: "Votações", cor: "#3b82f6" },
  traicao: { label: "Traições", cor: "#EA3943" },
  falaram_de_mim: { label: "Imprensa", cor: "#16C784" },
  crise_rede: { label: "Crise redes", cor: "#8b5cf6" },
};

/* ── FRENTE ── (lista de alertas, intacta) */
function AlertsFront() {
  const alerts = useLiveChannel<AlertsSnapshot>("alerts").data;
  const alertas = alerts?.alertas ?? [];

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Alertas</span>
        <LeituraIA
          card="ticker-alertas"
          contexto={`${alertas.length} alertas; vermelhos ${alertas.filter((a) => a.nivel === "vermelho").length}; último: ${alertas[0]?.titulo?.slice(0, 80) ?? "nenhum"}`}
          titulo="Alertas"
        />
        <FonteBadge real={true} como={FONTE_COMO.newsRadar} />
        <LiveBadge ch="alerts" cadenceMs={20000} />
      </div>
      {alertas.length ? (
        <div>
          {alertas.slice(0, 8).map((a) => (
            <div className="m-feed-item" key={a.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`m-pill ${a.nivel === "vermelho" ? "vermelho" : a.nivel === "amarelo" ? "amarelo" : ""}`.trim()}>
                  {a.nivel}
                </span>
                <span className="m-feed-title" style={{ flex: 1 }}>
                  {a.titulo}
                </span>
              </div>
              <div className="m-feed-meta">
                <span>{hora(a.t)}</span>
                <span>{a.corpo}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="m-ghost">nenhum alerta nas últimas 24h</div>
      )}
      <div className="m-flip-hint">↻ toque para ver os alertas por tipo</div>
    </div>
  );
}

/* ── VERSO ── (donut por tipo) */
function AlertsBack() {
  const alerts = useLiveChannel<AlertsSnapshot>("alerts").data;
  const alertas = alerts?.alertas ?? [];

  // Conta os alertas por tipo, mantendo apenas os tipos que apareceram.
  const counts = useMemo(() => {
    return Object.entries(TIPO_META)
      .map(([tipo, meta]) => ({
        ...meta,
        count: alertas.filter((a) => a.tipo === tipo).length,
      }))
      .filter((c) => c.count > 0);
  }, [alertas]);

  const total = counts.reduce((s, c) => s + c.count, 0);

  const opt = useMemo(
    () =>
      donutOption({
        items: counts.map((c) => ({ nome: c.label, valor: c.count, cor: c.cor })),
        centro: { valor: String(total), label: "alertas" },
      }),
    [counts, total],
  );

  // Tipo mais frequente para a leitura plana.
  const maior = [...counts].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Alertas por tipo</span>
      </div>
      {total ? (
        <div data-no-swipe onClick={(e) => e.stopPropagation()}>
          <EChart option={opt} height={200} />
        </div>
      ) : (
        <div className="m-ghost">nenhum alerta nas últimas 24h</div>
      )}
      <SectionLeitura>
        {maior
          ? `${maior.label} concentram a maior parte (${maior.count} de ${total}). Fique de olho nesse tipo de alerta para agir antes que vire crise.`
          : "Sem alertas no período — nada exigindo atenção imediata por enquanto."}
      </SectionLeitura>
    </div>
  );
}

export function AlertsFeed() {
  const alerts = useLiveChannel<AlertsSnapshot>("alerts").data;
  if (!alerts) {
    return (
      <div className="m-card">
        <div className="m-ghost">sincronizando alertas…</div>
      </div>
    );
  }
  return <FlipCard front={<AlertsFront />} back={<AlertsBack />} />;
}
