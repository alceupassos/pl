import { PleitosWall } from "@/components/telao/pleitos-wall";
import { PLEITOS, PLEITO_CFG, SNAPSHOT_META, type PleitoId } from "@/lib/telao/tse-apuracao";

import "../telao.css";
import "./pleitos.css";
import "./refresh.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Telão · Pleitos 2026 ao vivo",
};

// Telão de apuração: alterna Presidente, Governador SP, Senador SP,
// Dep. Federal SP e Dep. Estadual SP com dados oficiais do TSE.
export default function PleitosPage() {
  const fotoBase = Object.fromEntries(
    (Object.keys(PLEITO_CFG) as PleitoId[]).map((id) => [
      id,
      `/api/telao/foto/${PLEITO_CFG[id].eleicao}/${PLEITO_CFG[id].uf}`,
    ]),
  ) as Record<PleitoId, string>;
  return <PleitosWall pleitos={PLEITOS} fotoBase={fotoBase} meta={SNAPSHOT_META} />;
}
