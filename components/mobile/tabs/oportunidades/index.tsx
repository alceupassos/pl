"use client";

// Aba Oportunidades por região — placeholder do grupo em construção (o canal SSE
// "oportunidades" já está no ar; a tela completa chega no próximo deploy).

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { LiveBadge } from "@/components/mobile/ui/live-badge";

export default function Tab() {
  const { data } = useLiveChannel("oportunidades");
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Oportunidades por região</span>
        <LiveBadge ch="oportunidades" cadenceMs={30000} />
      </div>
      <div className="m-ghost">
        {data ? "dados ao vivo recebidos — tela completa no próximo deploy" : "sincronizando…"}
      </div>
    </div>
  );
}