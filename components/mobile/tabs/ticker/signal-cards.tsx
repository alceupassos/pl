"use client";

// Os 4 sinais da imagem do candidato, cada um num card claro (substitui o
// SOST-IDX composto + candlestick). Rótulo grande, número, uma frase de
// significado e a etiqueta de fonte (real ou modelado).

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import type { IdxSnapshot } from "@/lib/live-schemas";

type SinalDef = {
  key: keyof IdxSnapshot["breakdown"];
  icon: string;
  label: string;
  fonte: string;
  real: boolean;
  frase: (v: number) => string;
};

const SINAIS: SinalDef[] = [
  {
    key: "imprensa",
    icon: "📰",
    label: "Imprensa",
    fonte: "real · Google News",
    real: true,
    frase: (v) => (v >= 115 ? "em alta no jornal" : v >= 90 ? "presença normal" : "pouca cobertura"),
  },
  {
    key: "sentimento",
    icon: "💬",
    label: "Sentimento",
    fonte: "real · IA em PT",
    real: true,
    frase: (v) => (v >= 106 ? "clima favorável" : v >= 95 ? "clima neutro" : "clima negativo"),
  },
  {
    key: "seguidores",
    icon: "👥",
    label: "Seguidores",
    fonte: "real · YouTube",
    real: true,
    frase: (v) => (v >= 103 ? "base crescendo" : v >= 98 ? "base estável" : "base caindo"),
  },
  {
    key: "mencoes",
    icon: "📢",
    label: "Menções",
    fonte: "modelado",
    real: false,
    frase: (v) => (v >= 115 ? "muito falado nas redes" : v >= 90 ? "falam dele" : "pouco citado"),
  },
];

function seta(v: number): { txt: string; cls: string } {
  if (v >= 102) return { txt: "▲", cls: "m-up-c" };
  if (v <= 98) return { txt: "▼", cls: "m-down-c" };
  return { txt: "▬", cls: "m-muted-c" };
}

function SignalCard({ sinal, valor }: { sinal: SinalDef; valor: number }) {
  const s = seta(valor);
  return (
    <div className="m-card m-signal">
      <div className="m-signal-top">
        <span aria-hidden>{sinal.icon}</span>
        <span className="m-signal-label">{sinal.label}</span>
      </div>
      <div className="m-signal-val">
        <Odometer value={valor} decimals={0} />
        <span className={s.cls} style={{ fontSize: 13 }}>
          {s.txt}
        </span>
      </div>
      <div className="m-signal-frase">{sinal.frase(valor)}</div>
      <span className={`m-signal-tag ${sinal.real ? "real" : "mock"}`}>{sinal.fonte}</span>
    </div>
  );
}

export function SignalCards() {
  const idx = useLiveChannel<IdxSnapshot>("idx.sost").data;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "2px 2px 6px",
        }}
      >
        <span className="m-card-title">Imagem do candidato · 4 sinais</span>
        <LiveBadge ch="idx.sost" cadenceMs={2000} />
      </div>
      {idx ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {SINAIS.map((s) => (
            <SignalCard key={s.key} sinal={s} valor={idx.breakdown[s.key]} />
          ))}
        </div>
      ) : (
        <div className="m-ghost">sincronizando…</div>
      )}
    </div>
  );
}
