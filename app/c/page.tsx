import { PleitosWall } from "@/components/telao/pleitos-wall";
import { PLEITOS, PLEITO_CFG, SNAPSHOT_META, type PleitoId } from "@/lib/telao/tse-apuracao";

import "../telao/telao.css";
import "../telao/pleitos/pleitos.css";
import "../telao/pleitos/refresh.css";
import "../telao/pleitos/wood.css";

export const dynamic = "force-dynamic";

// aplica o tema salvo antes da pintura (evita piscar escuro → claro)
const TEMA_JS =
  "try{document.documentElement.dataset.tema=localStorage.getItem('telao-tema')==='escuro'?'escuro':'wood'}catch(e){document.documentElement.dataset.tema='wood'}";

export const metadata = {
  title: "Apuração 2026 ao vivo",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#efe4cf" };

// /c — mesma central de apuração do telão, em versão para celular/tablet
// (uma coluna, swipe entre telas, sem rotação automática).
export default function CentralMobilePage() {
  const fotoBase = Object.fromEntries(
    (Object.keys(PLEITO_CFG) as PleitoId[]).map((id) => [
      id,
      `/api/telao/foto/${PLEITO_CFG[id].eleicao}/${PLEITO_CFG[id].uf}`,
    ]),
  ) as Record<PleitoId, string>;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: TEMA_JS }} />
      <PleitosWall variant="mobile" pleitos={PLEITOS} fotoBase={fotoBase} meta={SNAPSHOT_META} />
    </>
  );
}
