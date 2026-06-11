"use client";

// Aba Gastos de campanha — placeholder do grupo em construção (o canal SSE
// "gastos" já está no ar; a tela completa chega no próximo deploy).

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { LiveBadge } from "@/components/mobile/ui/live-badge";

export default function Tab() {
  const { data } = useLiveChannel("gastos");
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Gastos de campanha</span>
        <LiveBadge ch="gastos" cadenceMs={30000} />
      </div>
      <div className="m-ghost">
        {data ? "dados ao vivo recebidos — tela completa no próximo deploy" : "sincronizando…"}
      </div>
    </div>
  );
}