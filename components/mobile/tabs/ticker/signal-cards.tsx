"use client";

// Os 4 sinais da imagem do candidato, cada um num card claro. FRENTE: a grade
// 2x2 dos sinais (substitui o SOST-IDX composto). VERSO (toque): traz de volta o
// CANDLESTICK estilo bolsa — o índice do candidato em 30 dias + os 4 valores que
// o compõem, com uma leitura em linguagem simples.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { candlestickOption } from "@/components/mobile/m-chart-options";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { MAvatar } from "@/components/mobile/ui/m-avatar";
import { FONTE_COMO } from "@/lib/mobile/fonte-meta";

const FONTE_COMO_SINAL: Record<keyof IdxSnapshot["breakdown"], string> = {
  imprensa: FONTE_COMO.imprensa,
  sentimento: FONTE_COMO.sentimento,
  seguidores: FONTE_COMO.seguidores,
  mencoes: FONTE_COMO.mencoes,
};
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { getAvatar } from "@/lib/avatars";
import type { IdxSnapshot } from "@/lib/live-schemas";

type SinalDef = {
  key: keyof IdxSnapshot["breakdown"];
  icon: string;
  label: string;
  fonte: string;
  real: boolean;
  frase: (v: number) => string;
};

const SINAIS_BASE: Omit<SinalDef, "fonte" | "real">[] = [
  {
    key: "imprensa",
    icon: "📰",
    label: "Imprensa",
    frase: (v) => (v >= 115 ? "em alta no jornal" : v >= 90 ? "presença normal" : "pouca cobertura"),
  },
  {
    key: "sentimento",
    icon: "💬",
    label: "Sentimento",
    frase: (v) => (v >= 106 ? "clima favorável" : v >= 95 ? "clima neutro" : "clima negativo"),
  },
  {
    key: "seguidores",
    icon: "👥",
    label: "Seguidores",
    frase: (v) => (v >= 103 ? "base crescendo" : v >= 98 ? "base estável" : "base caindo"),
  },
  {
    key: "mencoes",
    icon: "📢",
    label: "Menções",
    frase: (v) => (v >= 115 ? "muito falado nas redes" : v >= 90 ? "falam dele" : "pouco citado"),
  },
];

const FONTE_LABEL: Record<keyof IdxSnapshot["breakdown"], { real: string; modelado: string }> = {
  imprensa: { real: "real · Google News", modelado: "modelado" },
  sentimento: { real: "real · IA em PT", modelado: "modelado" },
  seguidores: { real: "real · YouTube", modelado: "modelado" },
  mencoes: { real: "real · Google Trends", modelado: "modelado" },
};

function sinaisFromIdx(idx: IdxSnapshot): SinalDef[] {
  return SINAIS_BASE.map((s) => {
    const isReal = idx.fontes?.[s.key] === "real";
    return {
      ...s,
      real: isReal,
      fonte: isReal ? FONTE_LABEL[s.key].real : FONTE_LABEL[s.key].modelado,
    };
  });
}

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
      <FonteBadge real={sinal.real} como={FONTE_COMO_SINAL[sinal.key]} />
    </div>
  );
}

/* ── FRENTE — a grade 2x2 dos 4 sinais ── */
function SignalsFront({ idx }: { idx: IdxSnapshot }) {
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
        <FonteBadge
          real={!!idx.fontes && Object.values(idx.fontes).some((f) => f === "real")}
          como={FONTE_COMO.idxComposto}
        />
        <LiveBadge ch="idx.sost" cadenceMs={2000} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {sinaisFromIdx(idx).map((s) => (
          <SignalCard key={s.key} sinal={s} valor={idx.breakdown[s.key]} />
        ))}
      </div>
      <div className="m-flip-hint">↻ toque para ver o índice em 30 dias</div>
    </div>
  );
}

/* ── VERSO — o candlestick estilo bolsa do índice do candidato ── */
function SignalsBack({ idx }: { idx: IdxSnapshot }) {
  // Une o histórico de 30 dias com a vela viva de hoje (mesmo padrão do SOST-IDX).
  const opt = useMemo(
    () => candlestickOption({ candles: [...idx.candles30d, idx.candleVivo] }),
    [idx],
  );

  // Rótulos legíveis para os 4 componentes do índice.
  const LINHAS: { key: keyof IdxSnapshot["breakdown"]; label: string }[] = [
    { key: "imprensa", label: "Imprensa" },
    { key: "sentimento", label: "Sentimento" },
    { key: "seguidores", label: "Seguidores" },
    { key: "mencoes", label: "Menções" },
  ];

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Índice do candidato · 30 dias</span>
        <MAvatar src={getAvatar("SOST")} nome="Sóstenes" cor="#16C784" size={26} />
      </div>

      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={opt} height={200} />
      </div>

      {/* Os 4 sinais que compõem o índice, em linhas rotuladas. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, margin: "8px 0 2px" }}>
        {LINHAS.map((l) => (
          <div
            key={l.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11.5,
            }}
          >
            <span className="m-muted-c">{l.label}</span>
            <span className="m-mono" style={{ fontWeight: 700 }}>
              <Odometer value={idx.breakdown[l.key]} decimals={0} />
            </span>
          </div>
        ))}
      </div>

      <SectionLeitura>
        Este é o <strong>índice de imagem</strong> do candidato nos últimos 30 dias, mostrado como
        uma ação na bolsa: cada vela é um dia. Ele junta os 4 sinais (imprensa, sentimento,
        seguidores e menções) num número só. <strong>Vela subindo = imagem em alta.</strong>
      </SectionLeitura>
    </div>
  );
}

export function SignalCards() {
  const idx = useLiveChannel<IdxSnapshot>("idx.sost").data;

  if (!idx) {
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
        <div className="m-ghost">sincronizando…</div>
      </div>
    );
  }

  return (
    <FlipCard front={<SignalsFront idx={idx} />} back={<SignalsBack idx={idx} />} />
  );
}
