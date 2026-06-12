"use client";

// Card que vira em 3D ao tocar (front ↔ back). Flip exclusivamente manual.

import { useState, type ReactNode } from "react";

export function FlipCard({
  front,
  back,
  ariaLabel = "Tocar para ver explicação",
}: {
  front: ReactNode;
  back: ReactNode;
  ariaLabel?: string;
}) {
  const [virado, setVirado] = useState(false);

  const abrir = () => setVirado(true);

  return (
    <div className="m-flip-wrap">
      <div className={`m-flip${virado ? " virado" : ""}`} data-no-swipe>
        <div className="m-flip-inner">
          <div
            className="m-flip-face m-flip-front"
            onClick={abrir}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                abrir();
              }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={virado}
            aria-label={ariaLabel}
          >
            {front}
          </div>
          <div className="m-flip-face m-flip-back" aria-hidden={!virado}>
            {back}
            <button
              type="button"
              className="m-flip-voltar"
              onClick={(e) => {
                e.stopPropagation();
                setVirado(false);
              }}
            >
              ‹ voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
