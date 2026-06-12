"use client";

// Tooltip explicativo que funciona em hover (desktop) E tap (mobile/touch).
// Hover é puro CSS (:hover); o tap alterna a classe .open via estado. Usado
// para explicar os "pontos fortes de mudança" do índice (cada componente do
// breakdown). Sem dependência — só um <span> com um popover absoluto.

import { useState, type ReactNode } from "react";

export function InfoTip({ children, texto }: { children: ReactNode; texto: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`m-tip${open ? " open" : ""}`}
      // stopPropagation: o tap abre o tooltip sem virar swipe de aba / clique no card.
      onClick={(e) => {
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      onMouseLeave={() => setOpen(false)}
      role="button"
      tabIndex={0}
      aria-label={texto}
    >
      {children}
      <span className="m-tip-pop" role="tooltip">
        {texto}
      </span>
    </span>
  );
}
