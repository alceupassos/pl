import { BocaEditor } from "@/components/telao/boca-editor";
import { PLEITOS } from "@/lib/telao/tse-apuracao";
import { BOCA_PLEITOS } from "@/lib/telao/boca-de-urna";

import "../telao.css";
import "../pleitos/pleitos.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Telão · Lançar boca de urna" };

export default function BocaDeUrnaPage() {
  const pleitos = PLEITOS.filter((p) => (BOCA_PLEITOS as readonly string[]).includes(p.id));
  return <BocaEditor pleitos={pleitos} />;
}
