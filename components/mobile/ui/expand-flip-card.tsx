"use client";

// Card com 3 estados: compacto → toque → expandido → toque → verso (flip 3D).
// Borda animada girando (verde/vermelha) conforme prop glow.

import { useState, type ReactNode } from "react";

export type ExpandPhase = "compact" | "expanded" | "back";

export function ExpandFlipCard({
  compact,
  front,
  back,
  glow,
  ariaLabel = "Tocar para expandir",
}: {
  compact: ReactNode;
  front: ReactNode;
  back: ReactNode;
  glow?: "up" | "down";
  ariaLabel?: string;
}) {
  const [phase, setPhase] = useState<ExpandPhase>("compact");
  const virado = phase === "back";

  const handleFrontClick = () => {
    if (phase === "compact") setPhase("expanded");
    else if (phase === "expanded") setPhase("back");
  };

  const glowClass = glow ? `m-spin-border ${glow}` : "";

  return (
    <div className={`m-spin-wrap ${glowClass}`.trim()}>
      <div className="m-spin-inner">
        <div className="m-flip-wrap">
          <div className={`m-flip${virado ? " virado" : ""}`} data-no-swipe>
            <div className="m-flip-inner">
              <div
                className="m-flip-face m-flip-front"
                onClick={handleFrontClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleFrontClick();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={phase !== "compact"}
                aria-label={ariaLabel}
              >
                {phase === "compact" ? compact : front}
              </div>
              <div className="m-flip-face m-flip-back" aria-hidden={!virado}>
                {back}
                <button
                  type="button"
                  className="m-flip-voltar"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhase("compact");
                  }}
                >
                  ‹ voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
