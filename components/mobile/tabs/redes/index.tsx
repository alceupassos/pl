"use client";

// Aba REDES — engajamento próprio: contadores por plataforma, monitor do
// último post (curva 1ª hora vs banda dos últimos 30 posts), racing semanal
// e detector de crise (z-score).

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { racingBarOption } from "@/components/mobile/m-chart-options";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import type { RedesState } from "@/lib/live-schemas";

const REDE_LABEL: Record<string, string> = {
  instagram: "Instagram",
  x: "X",
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
};

function Plataformas({ redes }: { redes: RedesState }) {
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Seguidores · hoje</span>
        <LiveBadge ch="redes" cadenceMs={3000} />
      </div>
      <div className="m-carousel" data-no-swipe>
        {redes.plataformas.map((p) => (
          <article className="m-quote-card" style={{ flexBasis: 168 }} key={p.rede}>
            <div className="m-quote-nome">{REDE_LABEL[p.rede] ?? p.rede}</div>
            <div className="m-quote-val">
              <Odometer value={p.seguidores} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span className={`m-mono ${p.deltaDia >= 0 ? "m-up-c" : "m-down-c"}`} style={{ fontSize: 11, fontWeight: 700 }}>
                {p.deltaDia >= 0 ? "▲" : "▼"} <Odometer value={p.deltaDia} signed /> hoje
              </span>
              <span className="m-mono m-muted-c" style={{ fontSize: 10.5 }}>
                eng <Odometer value={p.engajamento} decimals={1} suffix="%" />
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function MonitorUltimoPost({ redes }: { redes: RedesState }) {
  const post = redes.ultimoPost;
  const option = useMemo(() => {
    const minutos = post.bandaP25.map((_, i) => `${i}m`);
    return {
      backgroundColor: "transparent",
      animation: false,
      tooltip: {
        backgroundColor: "rgba(10,13,19,0.97)",
        borderColor: "#1e2638",
        textStyle: { color: "#e8ecf4", fontSize: 11 },
        confine: true,
        trigger: "axis" as const,
      },
      grid: { left: 6, right: 30, top: 8, bottom: 16, containLabel: true },
      xAxis: {
        type: "category" as const,
        data: minutos,
        boundaryGap: false,
        axisLabel: { color: "#8a93a8", fontSize: 9, interval: 14 },
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
      },
      yAxis: {
        type: "value" as const,
        position: "right" as const,
        scale: true,
        axisLabel: { color: "#8a93a8", fontSize: 9 },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      },
      series: [
        {
          name: "banda p25",
          type: "line" as const,
          data: post.bandaP25,
          stack: "banda",
          showSymbol: false,
          lineStyle: { opacity: 0 },
          silent: true,
          tooltip: { show: false },
        },
        {
          name: "banda média 30 posts",
          type: "line" as const,
          data: post.bandaP75.map((v, i) => v - post.bandaP25[i]),
          stack: "banda",
          showSymbol: false,
          lineStyle: { opacity: 0 },
          areaStyle: { color: "#8a93a8", opacity: 0.14 },
          silent: true,
          tooltip: { show: false },
        },
        {
          name: "este post",
          type: "line" as const,
          data: post.curva1h.map((p) => p.v),
          showSymbol: false,
          lineStyle: { width: 2.2, color: post.selo === "sono" ? "#EA3943" : "#16C784" },
          itemStyle: { color: "#16C784" },
        },
      ],
    };
  }, [post]);

  const selo = post.selo === "fogo" ? "🔥 acima da banda" : post.selo === "sono" ? "💤 abaixo da banda" : "— dentro da banda";

  return (
    <FlashCard watch={post.curtidas}>
      <div className="m-card-head">
        <span className="m-card-title">Monitor do último post · {REDE_LABEL[post.rede] ?? post.rede}</span>
        <LiveBadge ch="redes" cadenceMs={3000} />
      </div>
      <p style={{ fontSize: 12.5, color: "var(--m-text)", margin: "0 0 8px" }}>“{post.texto}”</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <span className="m-mono" style={{ fontSize: 13 }}>
          ❤ <Odometer value={post.curtidas} />
        </span>
        <span className="m-mono" style={{ fontSize: 13 }}>
          💬 <Odometer value={post.comentarios} />
        </span>
        <span className="m-mono" style={{ fontSize: 13 }}>
          ↗ <Odometer value={post.compartilhamentos} />
        </span>
        <span className="m-mono" style={{ fontSize: 13 }}>
          ▶ <Odometer value={post.views} />
        </span>
        <span className={`m-pill ${post.selo === "fogo" ? "up" : post.selo === "sono" ? "down" : ""}`.trim()}>{selo}</span>
      </div>
      <div data-no-swipe>
        <EChart option={option} height={140} />
      </div>
      <div className="m-feed-meta">
        <span>curva da 1ª hora vs banda média (p25–p75) dos últimos 30 posts</span>
      </div>
    </FlashCard>
  );
}

function RacingSemanal({ redes }: { redes: RedesState }) {
  const option = useMemo(
    () =>
      racingBarOption({
        items: redes.racingSemanal.map((r) => ({ nome: r.nome, valor: r.engajamento7d, cor: r.cor })),
      }),
    [redes.racingSemanal],
  );
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Racing semanal · engajamento (k)</span>
        <LiveBadge ch="redes" cadenceMs={3000} />
      </div>
      <div data-no-swipe>
        <EChart option={option} height={210} />
      </div>
    </div>
  );
}

function CriseDetector({ redes }: { redes: RedesState }) {
  const c = redes.crise;
  return (
    <div
      className="m-card"
      role={c.ativo ? "alert" : undefined}
      style={c.ativo ? { borderColor: "var(--m-down)", boxShadow: "0 0 22px -10px var(--m-down)" } : undefined}
    >
      <div className="m-card-head">
        <span className="m-card-title">Detector de crise</span>
        <span className={`m-pill ${c.ativo ? "vermelho" : "up"}`}>{c.ativo ? "CRISE EM CURSO" : "normal"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className={`m-mono ${c.ativo ? "m-down-c" : "m-up-c"}`} style={{ fontSize: 24, fontWeight: 800 }}>
          z = <Odometer value={c.zscore} decimals={2} />
        </span>
        <span className="m-muted-c" style={{ fontSize: 11 }}>
          {c.ativo
            ? "volume de polaridade negativa fora da banda — resposta segmentada recomendada"
            : "polaridade dentro da banda esperada (limiar z > 2)"}
        </span>
      </div>
    </div>
  );
}

export default function RedesTab() {
  const redes = useLiveChannel<RedesState>("redes").data;
  if (!redes) return <div className="m-ghost">sincronizando com as redes…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Plataformas redes={redes} />
      <MonitorUltimoPost redes={redes} />
      <RacingSemanal redes={redes} />
      <CriseDetector redes={redes} />
    </div>
  );
}
