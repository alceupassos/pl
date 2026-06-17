"use client";

// Fita de manchetes em loop infinito (CSS transform), duas trilhas
// alternáveis (Nacional/RJ), cada manchete com selo de tom.

import { useState } from "react";

import { useLiveChannel } from "@/components/mobile/live/use-live";
import type { TapeSnapshot, Tom } from "@/lib/live-schemas";

const SELO: Record<Tom, { glyph: string; className: string }> = {
  pos: { glyph: "▲", className: "m-up-c" },
  neg: { glyph: "▼", className: "m-down-c" },
  neu: { glyph: "•", className: "m-muted-c" },
};

export function TickerTape() {
  const tape = useLiveChannel<TapeSnapshot>("ticker.tape").data;
  const [trilha, setTrilha] = useState<"nacional" | "rj">("nacional");

  const itens = tape?.[trilha] ?? [];

  // A cada 2 manchetes, injeta o aviso "VERSÃO SOMENTE PARA TESTE" em vermelho.
  const conteudo = itens.flatMap((m, i) => {
    const item = (
      <span className="m-tape-item" key={m.id}>
        <span className={`selo ${SELO[m.tom].className}`}>{SELO[m.tom].glyph}</span>
        {m.texto}
      </span>
    );
    if ((i + 1) % 2 !== 0) return [item];
    return [
      item,
      <span
        className="m-tape-item"
        key={`teste-${m.id}`}
        style={{ color: "var(--m-down)", fontWeight: 800, letterSpacing: "0.04em" }}
      >
        VERSÃO SOMENTE PARA TESTE
      </span>,
    ];
  });

  return (
    <div className="m-tape" data-no-swipe>
      <button
        type="button"
        className="m-tape-tag"
        onClick={() => setTrilha((t) => (t === "nacional" ? "rj" : "nacional"))}
        aria-label={`Trocar trilha de manchetes (atual: ${trilha === "nacional" ? "Nacional" : "RJ"})`}
      >
        {trilha === "nacional" ? "BR" : "RJ"} ⇋
      </button>
      <div className="m-tape-track">
        {itens.length ? (
          // conteúdo duplicado para o loop ser contínuo (anima -50%)
          <span key={trilha}>
            {conteudo}
            {conteudo}
          </span>
        ) : (
          <span className="m-muted-c" style={{ fontSize: 11 }}>
            sincronizando manchetes…
          </span>
        )}
      </div>
    </div>
  );
}
