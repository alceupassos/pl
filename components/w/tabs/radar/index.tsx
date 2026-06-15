"use client";

import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import type { AlertsSnapshot } from "@/lib/live-schemas";

export default function RadarWTab() {
  const { data } = useLiveChannel<AlertsSnapshot>("alerts");
  const alertas = data?.alertas ?? [];

  return (
    <div className="m-tab-content">
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Radar · Imprensa BR</span>
          <FonteBadge
            real={alertas.length > 0}
            como="Google News RSS — manchetes sobre candidatos monitorados na watchlist."
          />
        </div>

        {alertas.length === 0 && (
          <div className="m-ghost">sincronizando alertas…</div>
        )}

        {alertas.slice(0, 20).map((a) => (
          <div
            key={a.id}
            style={{
              padding: "7px 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ fontSize: 12, lineHeight: 1.45 }}>{a.titulo}</div>
            <div className="m-muted-c" style={{ fontSize: 9.5, marginTop: 2 }}>
              {a.tipo} ·{" "}
              <span
                className={
                  a.nivel === "vermelho"
                    ? "m-down-c"
                    : a.nivel === "amarelo"
                      ? "m-up-c"
                      : "m-muted-c"
                }
              >
                {a.nivel}
              </span>
            </div>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Manchetes em tempo real via Google News RSS. Sentimento por pysentimiento (BERT PT).
      </SectionLeitura>
    </div>
  );
}
