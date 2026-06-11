// Linha de "leitura" estratégica ao pé de um card — server-safe, sem hooks.

import type React from "react";

export function SectionLeitura({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 8,
        fontSize: 11,
        lineHeight: 1.45,
        color: "var(--m-warn)",
        opacity: 0.92,
        fontFamily: "var(--m-font-sans)",
      }}
    >
      {"→ "}
      {children}
    </div>
  );
}
