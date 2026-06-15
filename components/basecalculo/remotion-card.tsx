"use client";

// Embute uma composition Remotion via <Player> (client-only, lazy). Só anima
// quando entra na viewport (IntersectionObserver) — evita N players rodando
// juntos na vitrine /basecalculo.

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentType } from "react";

const Player = dynamic(
  () =>
    import("@remotion/player").then(
      (m) => m.Player as unknown as ComponentType<Record<string, unknown>>,
    ),
  { ssr: false },
);

export function RemotionCard({
  component,
  inputProps,
  compW,
  compH,
  durationInFrames = 120,
  fps = 30,
}: {
  component: ComponentType<Record<string, unknown>>;
  inputProps: Record<string, unknown>;
  compW: number;
  compH: number;
  durationInFrames?: number;
  fps?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisivel(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        aspectRatio: `${compW} / ${compH}`,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "#0b0e14",
      }}
    >
      {visivel ? (
        <Player
          component={component}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          compositionWidth={compW}
          compositionHeight={compH}
          fps={fps}
          loop
          autoPlay
          controls={false}
          style={{ width: "100%", height: "100%" }}
        />
      ) : null}
    </div>
  );
}
