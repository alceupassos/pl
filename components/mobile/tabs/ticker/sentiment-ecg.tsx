"use client";

// Eletrocardiograma de sentimento — linha dupla streaming (positivas ×
// negativas) com janelas 1h/24h/7d e menções/min em odômetro.

import { useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { ecgStreamOption } from "@/components/mobile/m-chart-options";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import type { EcgSnapshot } from "@/lib/live-schemas";

const JANELAS = [
  { id: "h1", label: "1h" },
  { id: "h24", label: "24h" },
  { id: "d7", label: "7d" },
] as const;

type JanelaId = (typeof JANELAS)[number]["id"];

export function SentimentEcg() {
  const ecg = useLiveChannel<EcgSnapshot>("sent.ecg").data;
  const [janela, setJanela] = useState<JanelaId>("h1");

  const option = useMemo(() => {
    if (!ecg) return null;
    const win = ecg[janela];
    return ecgStreamOption({ pos: win.pos, neg: win.neg, resolucao: janela });
  }, [ecg, janela]);

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Sentimento · Sóstenes</span>
        <LiveBadge ch="sent.ecg" cadenceMs={2000} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {JANELAS.map((j) => (
            <button
              key={j.id}
              type="button"
              className={`m-pill ${janela === j.id ? "up" : ""}`.trim()}
              onClick={() => setJanela(j.id)}
              aria-pressed={janela === j.id}
            >
              {j.label}
            </button>
          ))}
        </div>
        {ecg ? (
          <span className="m-mono" style={{ fontSize: 12 }}>
            <Odometer value={ecg.mencoesMin} decimals={1} />{" "}
            <span className="m-muted-c">menções/min</span>
          </span>
        ) : null}
      </div>

      {option ? (
        <div data-no-swipe>
          <EChart option={option} height={150} />
        </div>
      ) : (
        <div className="m-ghost">sincronizando…</div>
      )}
    </div>
  );
}
