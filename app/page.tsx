// m.css dá os tokens .m-app aos espelhos do /m no desktop (ex.: seção
// Plenário); o modo .m-embed evita efeitos colaterais de página inteira.
import "./m/m.css";
import "./usage.css";

import { CampaignEntry } from "@/components/campaign-entry";

export default function Home() {
  return <CampaignEntry />;
}
