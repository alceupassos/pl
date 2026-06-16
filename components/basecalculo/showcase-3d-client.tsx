"use client";

// Vitrine (6 gráficos Recharts) renderizada SÓ NO CLIENTE (ssr:false). O SSR dos
// gráficos é pesado e, sob CPU saturada no servidor, fazia o /basecalculo demorar/
// estourar. A tabela auditável (dado real) continua server-side; aqui só a vitrine
// hidrata no navegador, deixando a resposta do servidor leve.

import dynamic from "next/dynamic";

import type { Showcase3DProps } from "@/components/basecalculo/showcase-3d";

const Showcase3D = dynamic(
  () => import("@/components/basecalculo/showcase-3d").then((m) => m.Showcase3D),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: 320,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#5b6478",
          fontSize: 13,
        }}
      >
        carregando vitrine do índice…
      </div>
    ),
  },
);

export function Showcase3DClient(props: Showcase3DProps) {
  return <Showcase3D {...props} />;
}
