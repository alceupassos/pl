"use client";

// Aba Equipe de campo — placeholder do grupo em construção (o canal SSE
// "equipe" já está no ar; a tela completa chega no próximo deploy).

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { LiveBadge } from "@/components/mobile/ui/live-badge";

export default function Tab() {
  const { data } = useLiveChannel("equipe");
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Equipe de campo</span>
        <LiveBadge ch="equipe" cadenceMs={30000} />
      </div>
      <div className="m-ghost">
        {data ? "dados ao vivo recebidos — tela completa no próximo deploy" : "sincronizando…"}
      </div>
    </div>
  );
}