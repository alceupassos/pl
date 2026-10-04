import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type WeeklyCampaignVideoProps = {
  candidate: string;
  headline: string;
  metric: string;
};

export function WeeklyCampaignVideo({
  candidate,
  headline,
  metric,
}: WeeklyCampaignVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  const pulse = interpolate(frame, [0, 150, 300], [0.9, 1.04, 0.96]);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #07140c 0%, #101016 58%, #05111f 100%)",
        color: "#f8fafc",
        fontFamily: "Inter, Arial, sans-serif",
        padding: 72,
      }}
    >
      <div style={{ fontSize: 38, letterSpacing: 4, textTransform: "uppercase", color: "#22c55e" }}>
        Cockpit 2026
      </div>
      <div
        style={{
          marginTop: 220,
          transform: `translateY(${interpolate(enter, [0, 1], [80, 0])}px)`,
          opacity: enter,
        }}
      >
        <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.03 }}>{candidate}</div>
        <div style={{ marginTop: 28, fontSize: 44, color: "#cbd5e1" }}>{headline}</div>
      </div>
      <div
        style={{
          marginTop: 160,
          width: 480,
          height: 480,
          borderRadius: 240,
          background: "rgba(34, 197, 94, 0.14)",
          border: "3px solid rgba(34, 197, 94, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${pulse})`,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 108, fontWeight: 900, color: "#22c55e" }}>{metric}</div>
          <div style={{ marginTop: 18, fontSize: 30, color: "#94a3b8" }}>intencao monitorada</div>
        </div>
      </div>
      <div style={{ marginTop: "auto", fontSize: 30, color: "#94a3b8" }}>
        Dados demonstrativos do cockpit de campanha
      </div>
    </AbsoluteFill>
  );
}
