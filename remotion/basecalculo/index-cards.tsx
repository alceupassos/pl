// Compositions Remotion da vitrine /basecalculo — animações com EFEITO 3D
// (perspective + spring + glow). Componentes React puros (padrão MotionReport):
// usados pelo <Player> via components/basecalculo/remotion-card.tsx.

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type CandViz = {
  simbolo: string;
  nome: string;
  cor: string;
  notas: number[]; // [menções, sentimento, imprensa, seguidores]
  score: number | null;
  posicao: number | null;
  reputacao: number | null;
};
export type SerieViz = { simbolo: string; cor: string; pts: number[] };

const BG = "#0b0e14";
const TXT = "#8a93a8";
const PILAR_LABEL = ["Menções", "Sentimento", "Imprensa", "Seguidores"];

function glowPulse(frame: number, base = 0.3, amp = 0.35) {
  return interpolate(frame % 90, [0, 45, 90], [base, base + amp, base], {
    extrapolateRight: "clamp",
  });
}

/* ── 1. PLACAR — 3 números entrando com spring + glow + profundidade ── */
export function PlacarRemotion({
  reputacao,
  posicao,
  tendencia,
  nome,
}: {
  reputacao: number | null;
  posicao: number | null;
  tendencia: string;
  nome: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tend = tendencia === "up" ? { s: "▲", c: "#16C784", l: "subindo" } : tendencia === "down" ? { s: "▼", c: "#EA3943", l: "caindo" } : { s: "▬", c: "#8a93a8", l: "estável" };
  const repCor = reputacao == null ? "#8a93a8" : reputacao >= 60 ? "#16C784" : reputacao >= 45 ? "#F5A623" : "#EA3943";
  const posCor = posicao == null ? "#8a93a8" : posicao >= 100 ? "#16C784" : "#EA3943";
  const items = [
    { n: 1, rotulo: "Reputação", valor: reputacao == null ? "—" : String(Math.round(reputacao)), cor: repCor, formula: "nota = 50 + 15·(s − μ)/σ" },
    { n: 2, rotulo: "Posição vs. adversários", valor: posicao == null ? "—" : String(Math.round(posicao)), cor: posCor, formula: "Score ÷ média × 100" },
    { n: 3, rotulo: "Tendência", valor: `${tend.s} ${tend.l}`, cor: tend.c, formula: "sinal(Score₍agora₎ − Score₍24h₎)" },
  ];
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "system-ui", padding: 28, perspective: 1200 }}>
      <div style={{ color: TXT, fontSize: 18, letterSpacing: 2, textTransform: "uppercase" }}>{nome}</div>
      <div style={{ display: "flex", gap: 22, flex: 1, alignItems: "center" }}>
        {items.map((it, i) => {
          const e = spring({ frame: frame - i * 10, fps, config: { damping: 14 } });
          const g = glowPulse(frame + i * 30);
          return (
            <div
              key={it.n}
              style={{
                flex: 1,
                textAlign: "center",
                transform: `translateY(${interpolate(e, [0, 1], [50, 0])}px) rotateY(${interpolate(e, [0, 1], [18, 0])}deg)`,
                opacity: e,
              }}
            >
              <div style={{ color: "#5b6478", fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>{it.n} · {it.rotulo.toUpperCase()}</div>
              <div style={{ fontSize: 96, fontWeight: 900, color: it.cor, lineHeight: 1.05, textShadow: `0 0 ${20 + g * 40}px ${it.cor}` }}>{it.valor}</div>
              <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 20, color: "#9fe7ff", textShadow: `0 0 ${10 + g * 20}px #22d3ee` }}>{it.formula}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ── 2. PILARES — barras crescendo numa cena 3D inclinada (nota ou contribuição) ── */
export function PilaresRemotion({
  candidatos,
  modo = "nota",
  pesos = [0.35, 0.3, 0.15, 0.2],
}: {
  candidatos: CandViz[];
  modo?: "nota" | "contrib";
  pesos?: number[];
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rotY = interpolate(frame % 240, [0, 120, 240], [-12, 12, -12]);
  const cores = ["#3b82f6", "#22c55e", "#f0c030", "#a855f7"];
  const maxVal = modo === "contrib" ? 40 : 100;
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "system-ui", padding: 24, perspective: 1100 }}>
      <div style={{ color: TXT, fontSize: 16, marginBottom: 8 }}>
        {modo === "contrib" ? "Contribuição nota×peso → Score" : "Notas 0–100 por pilar"}
      </div>
      <div style={{ flex: 1, display: "flex", gap: 18, alignItems: "flex-end", justifyContent: "center", transform: `rotateX(16deg) rotateY(${rotY}deg)`, transformStyle: "preserve-3d" }}>
        {candidatos.map((c) => (
          <div key={c.simbolo} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 280 }}>
              {c.notas.map((nota, i) => {
                const val = modo === "contrib" ? nota * pesos[i] : nota;
                const e = spring({ frame: frame - i * 4, fps, config: { damping: 18 } });
                const hPct = Math.max(0, Math.min(1, val / maxVal)) * e;
                return (
                  <div
                    key={i}
                    style={{
                      width: 22,
                      height: `${hPct * 100}%`,
                      background: `linear-gradient(180deg, ${cores[i]}, ${cores[i]}99)`,
                      boxShadow: `4px 0 0 ${cores[i]}55, 0 0 18px ${cores[i]}66`,
                      borderRadius: "3px 3px 0 0",
                    }}
                  />
                );
              })}
            </div>
            <div style={{ color: c.cor, fontWeight: 800, fontSize: 16 }}>{c.simbolo}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6 }}>
        {PILAR_LABEL.map((l, i) => (
          <span key={l} style={{ color: cores[i], fontSize: 12, fontWeight: 700 }}>● {l}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ── 3. SCATTER — pontos numa caixa 3D inclinada (posicionamento ou Score×Posição) ── */
export function ScatterRemotion({
  candidatos,
  modo = "posicionamento",
}: {
  candidatos: CandViz[];
  modo?: "posicionamento" | "scorepos";
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rotY = interpolate(frame % 260, [0, 130, 260], [-14, 14, -14]);
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "system-ui", padding: 24, perspective: 1000 }}>
      <div style={{ color: TXT, fontSize: 16, marginBottom: 8 }}>
        {modo === "scorepos" ? "Score × Posição (relação linear)" : "Posicionamento: menções × sentimento"}
      </div>
      <div style={{ position: "relative", flex: 1, transform: `rotateX(20deg) rotateY(${rotY}deg)`, transformStyle: "preserve-3d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
        {candidatos.map((c, i) => {
          const e = spring({ frame: frame - i * 8, fps, config: { damping: 15 } });
          const x = modo === "scorepos" ? (c.score ?? 50) : c.notas[0];
          const y = modo === "scorepos" ? (c.posicao ?? 100) / 1.5 : c.notas[1];
          const left = `${Math.max(4, Math.min(92, x * 0.9))}%`;
          const top = `${Math.max(4, Math.min(88, 100 - y))}%`;
          const size = 18 + (c.notas[3] / 100) * 26;
          return (
            <div key={c.simbolo} style={{ position: "absolute", left, top, transform: `translate(-50%,-50%) scale(${e})`, opacity: e }}>
              <div style={{ width: size, height: size, borderRadius: "50%", background: c.cor, boxShadow: `0 0 ${10 + size}px ${c.cor}, 0 10px 18px rgba(0,0,0,0.5)` }} />
              <div style={{ color: "#c8d0e0", fontSize: 12, textAlign: "center", marginTop: 2 }}>{c.simbolo}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ── 4. TRAJETÓRIA — linhas do Score desenhando no tempo, cena inclinada ── */
export function TrajetoriaRemotion({
  series,
  modo = "linha",
}: {
  series: SerieViz[];
  modo?: "linha" | "paisagem";
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const prog = interpolate(frame, [0, durationInFrames * 0.7], [0, 1], { extrapolateRight: "clamp" });
  const W = 600;
  const H = 300;
  const all = series.flatMap((s) => s.pts);
  const min = Math.min(...all, 0);
  const max = Math.max(...all, 1);
  const span = max - min || 1;
  const path = (pts: number[]) =>
    pts
      .map((v, i) => {
        const x = (i / (pts.length - 1 || 1)) * W;
        const y = H - ((v - min) / span) * H;
        return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "system-ui", padding: 24, perspective: 1100 }}>
      <div style={{ color: TXT, fontSize: 16, marginBottom: 8 }}>
        {modo === "paisagem" ? "Paisagem do Score no tempo" : "Trajetória do Score · tempo"}
      </div>
      <div style={{ flex: 1, transform: `rotateX(${modo === "paisagem" ? 32 : 18}deg) rotateZ(-2deg)`, transformStyle: "preserve-3d" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
          {[0, 1, 2, 3].map((g) => (
            <line key={g} x1={0} x2={W} y1={(g / 3) * H} y2={(g / 3) * H} stroke="rgba(255,255,255,0.06)" />
          ))}
          {series.map((s) => {
            const d = path(s.pts);
            return (
              <g key={s.simbolo}>
                <path d={d} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={5} transform="translate(4,8)" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - prog} />
                <path d={d} fill="none" stroke={s.cor} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - prog} style={{ filter: `drop-shadow(0 0 6px ${s.cor})` }} />
              </g>
            );
          })}
        </svg>
      </div>
    </AbsoluteFill>
  );
}
