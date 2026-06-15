"use client";

// Mini-visualizações com EFEITO 3D em CSS/Canvas (sem ECharts/echarts-gl) — leves
// para o mobile. Usadas no card SOST-IDX: Gauge3D (anel inclinado com glow),
// Bars3D (barras extrudadas isométricas em canvas) e SparkDepth (linha temporal
// com profundidade). Tudo redesenha em mudança de dados e resize.

import { useEffect, useRef } from "react";

/* ── util: clareia/escurece um hex (amt -1..1) ── */
function shade(hex: string, amt: number): string {
  const c = hex.replace("#", "");
  const n = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const f = amt < 0 ? 0 : 255;
  const t = Math.abs(amt);
  const mix = (ch: number) => Math.round((f - ch) * t) + ch;
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: unknown[],
) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const render = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || canvas.clientWidth || 240;
      const h = canvas.clientHeight || 150;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h);
    };
    render();
    const ro = new ResizeObserver(render);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/* ── Gauge3D — anel inclinado com glow (Reputação 0–100, Posição vs ref) ── */
export function Gauge3D({
  valor,
  max = 100,
  label,
  cor,
  size = 116,
}: {
  valor: number | null;
  max?: number;
  label: string;
  cor: string;
  size?: number;
}) {
  const v = valor ?? 0;
  const frac = Math.max(0, Math.min(1, max ? v / max : 0));
  const deg = frac * 360;
  const track = "rgba(255,255,255,0.08)";
  const ringMask = "radial-gradient(closest-side, transparent 67%, #000 69%)";
  return (
    <div style={{ perspective: 620, display: "inline-block" }}>
      <div style={{ transform: "rotateX(22deg)", width: size, height: size, position: "relative" }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: `conic-gradient(${cor} ${deg}deg, ${track} ${deg}deg 360deg)`,
            WebkitMask: ringMask,
            mask: ringMask,
            boxShadow: `0 0 24px ${cor}55, 0 12px 26px rgba(0,0,0,0.55)`,
          }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: size * 0.3, fontWeight: 900, color: cor, lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: `0 0 12px ${cor}aa` }}>
            {valor == null ? "—" : Math.round(v)}
          </span>
          <span style={{ fontSize: 8.5, color: "var(--m-muted, #8a93a8)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Bars3D — barras extrudadas isométricas (canvas) ── */
export function Bars3D({
  notas,
  height = 150,
}: {
  notas: { label: string; nota: number | null; cor: string }[];
  height?: number;
}) {
  const ref = useCanvas(
    (ctx, w, h) => {
      const depth = 9;
      const padX = 8;
      const baseY = h - 18;
      const maxH = baseY - 14;
      const n = notas.length || 1;
      const gap = 12;
      const barW = Math.max(10, (w - padX * 2 - depth - gap * (n - 1)) / n);
      notas.forEach((b, i) => {
        const nota = b.nota ?? 0;
        const x = padX + i * (barW + gap);
        const bh = (Math.max(0, Math.min(100, nota)) / 100) * maxH;
        const topY = baseY - bh;
        // frente
        ctx.fillStyle = b.nota == null ? "rgba(255,255,255,0.12)" : b.cor;
        ctx.fillRect(x, topY, barW, bh);
        // topo
        ctx.fillStyle = b.nota == null ? "rgba(255,255,255,0.18)" : shade(b.cor, 0.32);
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x + depth, topY - depth);
        ctx.lineTo(x + barW + depth, topY - depth);
        ctx.lineTo(x + barW, topY);
        ctx.closePath();
        ctx.fill();
        // lateral
        ctx.fillStyle = b.nota == null ? "rgba(0,0,0,0.3)" : shade(b.cor, -0.35);
        ctx.beginPath();
        ctx.moveTo(x + barW, topY);
        ctx.lineTo(x + barW + depth, topY - depth);
        ctx.lineTo(x + barW + depth, baseY - depth);
        ctx.lineTo(x + barW, baseY);
        ctx.closePath();
        ctx.fill();
        // valor
        ctx.fillStyle = "#c8d0e0";
        ctx.font = "700 11px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(b.nota == null ? "—" : String(Math.round(nota)), x + barW / 2, topY - depth - 4);
        // rótulo
        ctx.fillStyle = "#8a93a8";
        ctx.font = "600 8.5px system-ui";
        ctx.fillText(b.label, x + barW / 2, baseY + 12);
      });
    },
    [notas, height],
  );
  return <canvas ref={ref} style={{ width: "100%", height, display: "block" }} />;
}

/* ── SparkDepth — linha temporal com profundidade falsa (canvas) ── */
export function SparkDepth({
  valores,
  cor = "#16C784",
  height = 120,
}: {
  valores: number[];
  cor?: string;
  height?: number;
}) {
  const ref = useCanvas(
    (ctx, w, h) => {
      const pts = valores.length ? valores : [100, 100];
      const min = Math.min(...pts);
      const max = Math.max(...pts);
      const span = max - min || 1;
      const padX = 6;
      const baseY = h - 10;
      const topPad = 12;
      const xAt = (i: number) => padX + (i / (pts.length - 1 || 1)) * (w - padX * 2);
      const yAt = (v: number) => topPad + (1 - (v - min) / span) * (baseY - topPad);
      // grade em perspectiva (profundidade)
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let g = 0; g <= 4; g++) {
        const yy = topPad + (g / 4) * (baseY - topPad);
        ctx.beginPath();
        ctx.moveTo(padX + g * 2, yy);
        ctx.lineTo(w - padX, yy);
        ctx.stroke();
      }
      // sombra projetada (profundidade)
      ctx.beginPath();
      pts.forEach((v, i) => (i ? ctx.lineTo(xAt(i) + 4, yAt(v) + 8) : ctx.moveTo(xAt(i) + 4, yAt(v) + 8)));
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 3;
      ctx.stroke();
      // área
      const grad = ctx.createLinearGradient(0, topPad, 0, baseY);
      grad.addColorStop(0, `${cor}44`);
      grad.addColorStop(1, `${cor}00`);
      ctx.beginPath();
      pts.forEach((v, i) => (i ? ctx.lineTo(xAt(i), yAt(v)) : ctx.moveTo(xAt(i), yAt(v))));
      ctx.lineTo(xAt(pts.length - 1), baseY);
      ctx.lineTo(xAt(0), baseY);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      // linha
      ctx.beginPath();
      pts.forEach((v, i) => (i ? ctx.lineTo(xAt(i), yAt(v)) : ctx.moveTo(xAt(i), yAt(v))));
      ctx.strokeStyle = cor;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = cor;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    },
    [valores, cor, height],
  );
  return <canvas ref={ref} style={{ width: "100%", height, display: "block" }} />;
}
