// Recap semanal do Cockpit do Candidato (/m) — vertical 1080×1920, na
// estética do terminal de bolso: variação do SOST-IDX, melhor post e
// placar das votações da semana.

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type MobileRecapProps = {
  variacaoIdx: string;
  idxFechamento: string;
  melhorPost: string;
  melhorPostMetrica: string;
  placarVotacoes: string;
  fidelidade: string;
};

const MONO = "'JetBrains Mono', 'Cascadia Code', monospace";

function Bloco({
  delayFrames,
  children,
}: {
  delayFrames: number;
  children: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delayFrames, fps, config: { damping: 16 } });
  return (
    <div
      style={{
        transform: `translateY(${interpolate(enter, [0, 1], [60, 0])}px)`,
        opacity: enter,
        background: "#121724",
        border: "2px solid #1E2638",
        borderRadius: 28,
        padding: "44px 48px",
      }}
    >
      {children}
    </div>
  );
}

export function MobileRecap({
  variacaoIdx,
  idxFechamento,
  melhorPost,
  melhorPostMetrica,
  placarVotacoes,
  fidelidade,
}: MobileRecapProps) {
  const frame = useCurrentFrame();
  const positivo = !variacaoIdx.trim().startsWith("-");
  const pulse = interpolate(frame % 45, [0, 22, 45], [1, 0.35, 1]);

  return (
    <AbsoluteFill
      style={{
        background: "#0B0E14",
        color: "#e8ecf4",
        fontFamily: "Inter, Arial, sans-serif",
        padding: 64,
        display: "flex",
        flexDirection: "column",
        gap: 36,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 2 }}>
          COCKPIT <span style={{ color: "#16C784" }}>SOST</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 26, color: "#8a93a8" }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#16C784", opacity: pulse }} />
          RECAP SEMANAL
        </div>
      </div>

      <Bloco delayFrames={8}>
        <div style={{ fontFamily: MONO, fontSize: 26, color: "#8a93a8", letterSpacing: 3 }}>SOST-IDX · SEMANA</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 28, marginTop: 16 }}>
          <div style={{ fontSize: 150, fontWeight: 900, fontFamily: MONO }}>{idxFechamento}</div>
          <div style={{ fontSize: 64, fontWeight: 800, fontFamily: MONO, color: positivo ? "#16C784" : "#EA3943" }}>
            {positivo ? "▲" : "▼"} {variacaoIdx}
          </div>
        </div>
      </Bloco>

      <Bloco delayFrames={34}>
        <div style={{ fontFamily: MONO, fontSize: 26, color: "#8a93a8", letterSpacing: 3 }}>MELHOR POST</div>
        <div style={{ fontSize: 44, lineHeight: 1.3, marginTop: 16 }}>“{melhorPost}”</div>
        <div style={{ fontSize: 38, fontWeight: 800, fontFamily: MONO, color: "#16C784", marginTop: 18 }}>
          {melhorPostMetrica} 🔥
        </div>
      </Bloco>

      <Bloco delayFrames={60}>
        <div style={{ fontFamily: MONO, fontSize: 26, color: "#8a93a8", letterSpacing: 3 }}>PLENÁRIO · SEMANA</div>
        <div style={{ fontSize: 56, fontWeight: 800, marginTop: 16 }}>{placarVotacoes}</div>
        <div style={{ fontSize: 36, fontFamily: MONO, color: "#16C784", marginTop: 12 }}>
          fidelidade da bancada: {fidelidade}
        </div>
      </Bloco>

      <div style={{ marginTop: "auto", fontSize: 26, color: "#8a93a8", fontFamily: MONO }}>
        dados demonstrativos · cockpit do candidato · /m
      </div>
    </AbsoluteFill>
  );
}
