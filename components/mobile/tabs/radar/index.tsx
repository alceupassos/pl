"use client";

// Aba RADAR — imprensa e munição: três feeds com swipe horizontal
// (Falaram de mim / Pauta da semana / Munição) + scatter de colunistas.

import { Copy, Share2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import type { RadarItem, RadarState, Tom } from "@/lib/live-schemas";

const TOM_PILL: Record<Tom, { label: string; className: string }> = {
  pos: { label: "favorável", className: "up" },
  neg: { label: "crítico", className: "down" },
  neu: { label: "neutro", className: "" },
};

const FEEDS = [
  { id: "falaramDeMim", label: "Falaram de mim" },
  { id: "pauta", label: "Pauta da semana" },
  { id: "municao", label: "Munição" },
] as const;

type FeedId = (typeof FEEDS)[number]["id"];

function hora(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function compartilhar(item: RadarItem) {
  const texto = `${item.titulo} — ${item.veiculo}`;
  if (navigator.share) {
    navigator.share({ text: texto, url: item.link }).catch(() => undefined);
  } else {
    navigator.clipboard?.writeText(`${texto}${item.link ? ` ${item.link}` : ""}`).catch(() => undefined);
  }
}

function FeedItem({ item, municao }: { item: RadarItem; municao?: boolean }) {
  const tom = TOM_PILL[item.tom];
  return (
    <div className="m-feed-item">
      <div className="m-feed-title">{item.titulo}</div>
      <div className="m-feed-meta" style={{ justifyContent: "space-between" }}>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={`m-pill ${tom.className}`.trim()}>{tom.label}</span>
          {item.veiculo} · {hora(item.t)} · alcance {item.alcance.toLocaleString("pt-BR")}k
        </span>
        {municao ? (
          <span style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              aria-label="Copiar"
              onClick={() => navigator.clipboard?.writeText(`${item.titulo} — ${item.veiculo}`).catch(() => undefined)}
            >
              <Copy size={14} color="var(--m-muted)" />
            </button>
            <button type="button" aria-label="Compartilhar" onClick={() => compartilhar(item)}>
              <Share2 size={14} color="var(--m-muted)" />
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Feeds({ radar }: { radar: RadarState }) {
  const [ativo, setAtivo] = useState<FeedId>("falaramDeMim");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const irPara = (id: FeedId) => {
    setAtivo(id);
    const idx = FEEDS.findIndex((f) => f.id === id);
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Radar de imprensa</span>
        <LiveBadge ch="radar" cadenceMs={10000} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {FEEDS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`m-pill ${ativo === f.id ? "up" : ""}`.trim()}
            onClick={() => irPara(f.id)}
            aria-pressed={ativo === f.id}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        ref={scrollerRef}
        className="m-carousel"
        data-no-swipe
        style={{ scrollSnapType: "x mandatory" }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          const id = FEEDS[Math.max(0, Math.min(FEEDS.length - 1, idx))].id;
          if (id !== ativo) setAtivo(id);
        }}
      >
        {FEEDS.map((f) => (
          <div key={f.id} style={{ flex: "0 0 100%", scrollSnapAlign: "start" }}>
            {f.id === "municao" ? (
              <p className="m-muted-c" style={{ fontSize: 10.5, margin: "2px 0 4px" }}>
                Matérias negativas sobre o governo · 24h · ranqueadas por alcance
              </p>
            ) : null}
            {radar[f.id].map((item) => (
              <FeedItem key={item.id} item={item} municao={f.id === "municao"} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScatterColunistas({ radar }: { radar: RadarState }) {
  const option = useMemo(
    () => ({
      backgroundColor: "transparent",
      animationDurationUpdate: 400,
      tooltip: {
        backgroundColor: "rgba(10,13,19,0.97)",
        borderColor: "#1e2638",
        textStyle: { color: "#e8ecf4", fontSize: 11 },
        confine: true,
        formatter: (p: { data: { name: string; value: number[]; veiculo: string } }) =>
          `<b>${p.data.name}</b><br/>${p.data.veiculo}<br/>tom ${p.data.value[0] > 0 ? "+" : ""}${p.data.value[0]} · alcance ${p.data.value[1]}k`,
      },
      grid: { left: 8, right: 16, top: 12, bottom: 8, containLabel: true },
      xAxis: {
        name: "tom",
        nameTextStyle: { color: "#8a93a8", fontSize: 9 },
        type: "value",
        min: -1,
        max: 1,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        axisLabel: { color: "#8a93a8", fontSize: 9 },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      },
      yAxis: {
        name: "alcance",
        nameTextStyle: { color: "#8a93a8", fontSize: 9 },
        type: "value",
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        axisLabel: { color: "#8a93a8", fontSize: 9 },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      },
      series: [
        {
          type: "scatter",
          symbolSize: 13,
          data: radar.colunistas.map((c) => ({
            name: c.nome,
            veiculo: c.veiculo,
            value: [c.tom, c.alcance],
            itemStyle: {
              color: c.tom > 0.15 ? "#16C784" : c.tom < -0.15 ? "#EA3943" : "#8a93a8",
              opacity: 0.85,
            },
          })),
          label: {
            show: true,
            position: "top",
            color: "#8a93a8",
            fontSize: 8,
            formatter: (p: { data: { name: string } }) => p.data.name.split(" ")[0],
          },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: "rgba(255,255,255,0.12)", type: "dashed" },
            data: [{ xAxis: 0 }],
          },
        },
      ],
    }),
    [radar.colunistas],
  );

  if (!radar.colunistas.length) return null;
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Colunistas · tom × alcance</span>
        <LiveBadge ch="radar" cadenceMs={10000} />
      </div>
      <div data-no-swipe>
        <EChart option={option} height={210} />
      </div>
    </div>
  );
}

export default function RadarTab() {
  const radar = useLiveChannel<RadarState>("radar").data;
  if (!radar) return <div className="m-ghost">sincronizando com a imprensa…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Feeds radar={radar} />
      <ScatterColunistas radar={radar} />
    </div>
  );
}
