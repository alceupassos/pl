"use client";

// Espelho desktop da aba Plenário do /m — compõe os MESMOS componentes
// vivos (placar, fidelidade, cabo de guerra, racing) com um provider SSE
// próprio (o cockpit desktop não monta o LiveDataProvider global do /m).
// O m.css é importado por app/page.tsx; .m-embed neutraliza o layout de
// página inteira do .m-app.

import { LiveDataProvider } from "@/components/mobile/live/provider";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import {
  CaboDeGuerra,
  FidelidadeBancada,
  PlacarVotacao,
  RacingVoz,
} from "@/components/mobile/tabs/plenario";
import type { PlenarioState } from "@/lib/live-schemas";

function PlenarioInner() {
  const plenario = useLiveChannel<PlenarioState>("plenario").data;
  if (!plenario) {
    return <div className="m-ghost">conectando ao plenário…</div>;
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
        gap: 12,
        alignItems: "start",
      }}
    >
      <PlacarVotacao plenario={plenario} />
      <FidelidadeBancada plenario={plenario} />
      <CaboDeGuerra plenario={plenario} />
      <RacingVoz plenario={plenario} />
    </div>
  );
}

export function PlenarioSection() {
  return (
    <div className="section active">
      <div className="m-app m-embed">
        <LiveDataProvider>
          <PlenarioInner />
        </LiveDataProvider>
      </div>
    </div>
  );
}
