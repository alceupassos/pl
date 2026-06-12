"use client";

// Card que vira em 3D ao tocar (front ↔ back), com o verso rolável. O front e o
// back trazem o próprio estilo de .m-card; aqui só montamos a estrutura 3D.
// data-no-swipe evita que o toque vire swipe de aba; os elementos interativos
// do front (pills/chart) devem dar stopPropagation para não disparar o flip.

import { useState, type ReactNode } from "react";

export function FlipCard({ front, back }: { front: ReactNode; back: ReactNode }) {
  const [virado, setVirado] = useState(false);
  return (
    <div className={`m-flip${virado ? " virado" : ""}`} data-no-swipe>
      <div className="m-flip-inner">
        <div
          className="m-flip-face m-flip-front"
          onClick={() => setVirado(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setVirado(true);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={virado}
          aria-label="Tocar para entender o índice"
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
  );
}
