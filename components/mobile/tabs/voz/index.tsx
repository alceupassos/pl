"use client";

// Aba Voz do eleitorado — placeholder do grupo em construção (o canal SSE
// "voz" já está no ar; a tela completa chega no próximo deploy).

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { LiveBadge } from "@/components/mobile/ui/live-badge";

export default function Tab() {
  const { data } = useLiveChannel("voz");
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Voz do eleitorado</span>
        <LiveBadge ch="voz" cadenceMs={30000} />
      </div>
      <div className="m-ghost">
        {data ? "dados ao vivo recebidos — tela completa no próximo deploy" : "sincronizando…"}
      </div>
    </div>
  );
}