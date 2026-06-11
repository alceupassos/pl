"use client";

// Feed de alertas — spikes, votações e menções, com nível amarelo/vermelho.

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import type { AlertsSnapshot } from "@/lib/live-schemas";

function hora(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AlertsFeed() {
  const alerts = useLiveChannel<AlertsSnapshot>("alerts").data;
  const alertas = alerts?.alertas ?? [];

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Alertas</span>
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
    </div>
  );
}
