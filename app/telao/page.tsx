import { LiveDataProvider } from "@/components/mobile/live/provider";
import { TelaoWall } from "@/components/telao/telao-wall";

import "./telao.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sala de Guerra · Cadastramento ao vivo",
};

// Telão full-screen (TV da sala de guerra). Fora do shell de abas do cockpit.
// Os dados vivos chegam pelo SSE /api/stream via LiveDataProvider (mesmo do /m).
export default function TelaoPage() {
  return (
    <LiveDataProvider>
      <TelaoWall />
    </LiveDataProvider>
  );
}
